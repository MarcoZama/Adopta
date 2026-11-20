import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import editions from "./editions.json" with { type: "json" };

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const componentRoot = path.join(root, "src", "botcomponents");
export const semanticTargets = [
  "vm_Adopta.topic.RisolviComunicazione",
  "vm_Adopta.topic.SpiegaComunicazione",
];

export function filesUnder(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(name) : [name];
  });
}

export function readComponent(name, edition = "it") {
  const profile = editions[edition];
  assert.ok(profile, `Unknown edition: ${edition}`);
  return YAML.parse(fs.readFileSync(path.join(root, profile.source, "botcomponents", name, "data"), "utf8"));
}

export function walk(value) {
  if (!value || typeof value !== "object") return [];
  return [value, ...Object.values(value).flatMap(walk)];
}

export function runSdk(request) {
  const result = spawnSync("pwsh", [
    "-NoLogo", "-NoProfile", "-File", path.join(root, "deploy", "Test-Agent.ps1"),
  ], {
    input: JSON.stringify(request),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

export function validateSolution(edition = "it", sourceOverride) {
  const profile = editions[edition];
  assert.ok(profile, `Unknown edition: ${edition}`);
  const source = sourceOverride ?? path.join(root, profile.source);
  const components = path.join(source, "botcomponents");
  const files = filesUnder(source);
  const dataFiles = files.filter((name) => path.basename(name) === "data");
  const manifest = fs.readFileSync(path.join(source, "Other", "Solution.xml"), "utf8");
  assert.ok(manifest.includes(`<UniqueName>${profile.solution}</UniqueName>`), "Wrong solution edition");
  for (const bot of [profile.agent, profile.coach]) {
    const metadata = fs.readFileSync(path.join(source, "bots", bot, "bot.xml"), "utf8");
    assert.ok(metadata.includes(`<language>${profile.lcid}</language>`), `Wrong primary language: ${bot}`);
  }
  for (const app of Object.values(profile.apps)) {
    const metadata = fs.readFileSync(path.join(source, "CanvasApps", `${app.schema}.meta.xml`), "utf8");
    const uris = [...metadata.matchAll(/<CodeAppPackageUri>([^<]+)<\/CodeAppPackageUri>/g)].map((match) => match[1]);
    assert.equal(uris[0], `/CanvasApps/${app.schema}_CodeAppPackages/index.html_ContentType_text/html`,
      `Invalid code app launch entry: ${app.schema}`);
    assert.equal(uris.some((uri) => uri.includes("/edition.json_ContentType_")), false,
      `Build diagnostic published as app content: ${app.schema}`);
    if (sourceOverride) {
      const entry = path.join(source, "CanvasApps", `${app.schema}_CodeAppPackages`, "index.html");
      assert.ok(fs.existsSync(entry), `Missing packaged HTML: ${app.schema}`);
      assert.match(fs.readFileSync(entry, "utf8"), /<script\b[^>]*type=["']module["']/i,
        `Code app entry is not the expected application HTML: ${app.schema}`);
    }
  }
  for (const file of files.filter((name) => !name.includes("_CodeAppPackages"))) {
    const text = fs.readFileSync(file, "utf8");
    const foreign = edition === "en" ? /\bvm_adopta(?!en)/i : /\bvm_adoptaen/i;
    assert.equal(foreign.test(text), false, `Cross-edition schema reference in ${file}`);
  }
  for (const name of files.filter((name) => name.endsWith(".json"))) {
    JSON.parse(fs.readFileSync(name, "utf8"));
  }
  for (const name of dataFiles) {
    const document = YAML.parseDocument(fs.readFileSync(name, "utf8"), { uniqueKeys: true });
    assert.deepEqual(document.errors, [], name);
    const nodes = walk(document.toJS());
    const text = fs.readFileSync(name, "utf8");
    assert.equal(/Global\.(UserLanguage|CommunicationEnglish)|Topic\.(English|Language)\b/.test(text), false,
      `Runtime language selection in ${name}`);
    for (const node of nodes) {
      assert.equal(["Language", "English"].includes(node.propertyName), false, `Language input in ${name}`);
      if (node.botSchemaName) assert.equal(node.botSchemaName, profile.coach, `Cross-edition Coach in ${name}`);
    }
    const ids = nodes.filter((node) => typeof node.id === "string").map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `Duplicate action IDs in ${name}`);
    for (const node of nodes.filter((node) => node.kind === "GotoAction")) {
      assert.ok(ids.includes(node.actionId), `Missing jump target ${node.actionId} in ${name}`);
    }
    for (const node of nodes.filter((node) => ["BeginDialog", "ReplaceDialog"].includes(node.kind))) {
      if (node.dialog?.startsWith("vm_")) {
        assert.ok(fs.existsSync(path.join(components, node.dialog, "data")), `Missing dialog ${node.dialog}`);
      }
    }
  }
  const result = runSdk({
    validatePaths: dataFiles,
    xmlPaths: files.filter((name) => name.endsWith(".xml")),
    cases: [],
    semanticRoot: components,
    semanticBotSchema: profile.agent,
    // The local BotEntity has no authenticated-channel or AI Builder runtime schema.
    // Validate that initialization contract separately; never hide its environment validation requirement.
    semanticTargets: fs.readdirSync(components).filter((name) =>
      name.startsWith(`${profile.agent}.topic.`) && !name.endsWith(".InizializzazioneProfilo")),
  });
  assert.deepEqual(result.semanticErrors, [], JSON.stringify(result.semanticErrors, null, 2));
  const coach = runSdk({
    semanticRoot: components,
    semanticBotSchema: profile.coach,
    semanticTargets: fs.readdirSync(components).filter((name) => name.startsWith(`${profile.coach}.topic.`)),
  });
  assert.deepEqual(coach.semanticErrors, [], JSON.stringify(coach.semanticErrors, null, 2));
  return { yaml: result.validated, xml: result.xmlCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const edition = process.argv[2] ?? "it";
  console.log(`Validated ${edition} solution:`, validateSolution(edition, process.argv[3]));
}
