import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const componentRoot = path.join(root, "src", "botcomponents");

export function filesUnder(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(name) : [name];
  });
}

export function readComponent(name) {
  return YAML.parse(fs.readFileSync(path.join(componentRoot, name, "data"), "utf8"));
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

export function validateSolution() {
  const files = filesUnder(path.join(root, "src"));
  const dataFiles = files.filter((name) => path.basename(name) === "data");
  for (const name of files.filter((name) => name.endsWith(".json"))) {
    JSON.parse(fs.readFileSync(name, "utf8"));
  }
  for (const name of dataFiles) {
    const document = YAML.parseDocument(fs.readFileSync(name, "utf8"), { uniqueKeys: true });
    assert.deepEqual(document.errors, [], name);
    const nodes = walk(document.toJS());
    const ids = nodes.filter((node) => typeof node.id === "string").map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `Duplicate action IDs in ${name}`);
    for (const node of nodes.filter((node) => node.kind === "GotoAction")) {
      assert.ok(ids.includes(node.actionId), `Missing jump target ${node.actionId} in ${name}`);
    }
    for (const node of nodes.filter((node) => ["BeginDialog", "ReplaceDialog"].includes(node.kind))) {
      if (node.dialog?.startsWith("vm_")) {
        assert.ok(fs.existsSync(path.join(componentRoot, node.dialog, "data")), `Missing dialog ${node.dialog}`);
      }
    }
  }
  const result = runSdk({
    validatePaths: dataFiles,
    xmlPaths: files.filter((name) => name.endsWith(".xml")),
    cases: [],
  });
  return { yaml: result.validated, xml: result.xmlCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Validated solution:", validateSolution());
}
