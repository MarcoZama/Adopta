import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const versionPattern = /^\d+\.\d+\.\d+\.\d+$/;

export function nextReleaseVersion(italianVersion, englishVersion, tags) {
  assert.equal(italianVersion, englishVersion, "IT and EN source versions must match.");
  assert.ok(typeof italianVersion === "string" && versionPattern.test(italianVersion),
    "Source version must have four numeric components.");
  const source = italianVersion.split(".").map(Number);
  assert.ok(source.every((part) => part >= 0 && part <= 65535),
    "Source version component outside 0..65535.");
  assert.ok(Array.isArray(tags) && tags.every((tag) => typeof tag === "string"),
    "Expected an array of existing GitHub tag names.");

  let latestRevision = -1;
  for (const tag of tags) {
    if (!tag.startsWith("v") || !versionPattern.test(tag.slice(1))) continue;
    const parts = tag.slice(1).split(".").map(Number);
    if (parts.some((part) => part > 65535) ||
        !parts.slice(0, 3).every((part, index) => part === source[index])) continue;
    latestRevision = Math.max(latestRevision, parts[3]);
  }
  const revision = Math.max(source[3], latestRevision + 1);
  assert.ok(revision <= 65535,
    "Release revision exhausted. Increase major, minor or build in both source manifests.");
  return [...source.slice(0, 3), revision].join(".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const request = JSON.parse(fs.readFileSync(0, "utf8"));
  console.log(nextReleaseVersion(request.it, request.en, request.tags));
}
