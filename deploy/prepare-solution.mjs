import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import editions from "./editions.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function codeAppAssets(folder) {
  const entry = path.join(folder, "index.html");
  assert.ok(fs.existsSync(entry) && fs.statSync(entry).isFile(), `Missing code app entry point: ${entry}`);
  const assets = fs.readdirSync(folder, { recursive: true }).filter((name) =>
    name !== "edition.json" && name !== "index.html" && fs.statSync(path.join(folder, name)).isFile(),
  ).sort();
  return ["index.html", ...assets];
}

export function prepareSolution(edition, destination, sourceOverride) {
  const profile = editions[edition];
  assert.ok(profile, `Unknown edition: ${edition}`);
  const stage = path.resolve(destination);
  const workRoot = path.join(root, ".solution-build") + path.sep;
  assert.ok(stage.startsWith(workRoot), "Stage must be a named subdirectory of .solution-build.");
  assert.ok(!fs.existsSync(stage), `Stage already exists: ${stage}`);
  fs.cpSync(sourceOverride ?? path.join(root, profile.source), stage, { recursive: true });

  for (const app of Object.values(profile.apps)) {
    const built = path.join(root, app.project, `dist-${edition}`);
    const marker = JSON.parse(fs.readFileSync(path.join(built, "edition.json"), "utf8"));
    assert.equal(marker.edition, edition, `Wrong ${app.project} edition`);
    assert.equal(marker.schema, app.schema, `Wrong ${app.project} schema`);
    const packageFolder = `${app.schema}_CodeAppPackages`;
    const target = path.join(stage, "CanvasApps", packageFolder);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
    const assets = codeAppAssets(built);
    for (const name of assets) {
      const file = path.join(target, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(path.join(built, name), file);
    }
    const metadataFile = path.join(stage, "CanvasApps", `${app.schema}.meta.xml`);
    let metadata = fs.readFileSync(metadataFile, "utf8");
    const uri = (name) => {
      const extension = path.extname(name);
      const contentType = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" }[extension];
      assert.ok(contentType, `Unsupported code app asset: ${name}`);
      return `    <CodeAppPackageUri>/CanvasApps/${packageFolder}/${name.replaceAll("\\", "/")}_ContentType_${contentType}</CodeAppPackageUri>`;
    };
    metadata = metadata.replace(/<CodeAppPackageUris>[\s\S]*?<\/CodeAppPackageUris>/,
      `<CodeAppPackageUris>\n${assets.map(uri).join("\n")}\n  </CodeAppPackageUris>`);
    metadata = metadata.replace(/<DisplayName>[^<]*<\/DisplayName>/,
      `<DisplayName>${profile.label} ${app.project === "admin-app" ? "Admin" : "Communications"} (code app)</DisplayName>`);
    if (edition === "en") {
      metadata = metadata.replaceAll("adoptaschedulecommunication", "adoptaenschedulecommunication")
        .replaceAll("adoptamanagecommunication", "adoptaenmanagecommunication");
    }
    fs.writeFileSync(metadataFile, metadata);
  }
  return stage;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(prepareSolution(process.argv[2], process.argv[3]));
}
