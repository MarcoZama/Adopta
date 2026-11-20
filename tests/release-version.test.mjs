import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { nextReleaseVersion } from "../deploy/release-version.mjs";

test("release numbering increments only the revision and compares existing tags numerically", () => {
  assert.equal(nextReleaseVersion("1.0.0.20", "1.0.0.20", ["v1.0.0.20"]), "1.0.0.21");
  assert.equal(nextReleaseVersion("1.0.0.20", "1.0.0.20",
    ["v1.0.0.9", "v1.0.0.99", "v1.0.0.21", "v1.0.2.1", "v2.0.0.100", "docs-update"]),
  "1.0.0.100");
  assert.equal(nextReleaseVersion("1.0.0.20", "1.0.0.20",
    ["v1.0.0.20", "v1.0.0.21"]), "1.0.0.22");
});

test("source versions provide the initial revision and a floor for a new release series", () => {
  assert.equal(nextReleaseVersion("1.0.0.20", "1.0.0.20", []), "1.0.0.20");
  assert.equal(nextReleaseVersion("1.0.0.30", "1.0.0.30", ["v1.0.0.20"]), "1.0.0.30");
  assert.equal(nextReleaseVersion("1.1.0.0", "1.1.0.0", ["v1.0.0.65535"]), "1.1.0.0");
  assert.equal(nextReleaseVersion("1.0.0.20", "1.0.0.20", ["v1.0.0.65534"]), "1.0.0.65535");
});

test("invalid or inconsistent source versions and exhausted revisions fail explicitly", () => {
  assert.throws(() => nextReleaseVersion("1.0.0.20", "1.0.0.21", []), /must match/);
  for (const version of ["1.0.20", "1.0.0.-1", "1.0.0.65536", "1.0.0.1.2"]) {
    assert.throws(() => nextReleaseVersion(version, version, []), /four numeric|outside/);
  }
  assert.throws(() => nextReleaseVersion("1.0.0.20", "1.0.0.20", null), /array/);
  assert.throws(() => nextReleaseVersion("1.0.0.20", "1.0.0.20", ["v1.0.0.65535"]),
    /revision exhausted/);
});

test("publication reserves the selected tag first and refuses to overwrite an existing version", () => {
  const workflow = YAML.parse(fs.readFileSync(".github/workflows/release.yml", "utf8"));
  const publish = workflow.jobs.publish.steps.find((step) => step.run).run;
  const parent = path.resolve(".solution-build");
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, "release-publication-"));
  try {
    for (const outcome of ["success", "tag-exists"]) {
      const directory = path.join(fixture, outcome);
      fs.mkdirSync(path.join(directory, "release"), { recursive: true });
      for (const edition of ["IT", "EN"]) for (const type of ["managed", "unmanaged"]) {
        fs.writeFileSync(path.join(directory, "release", `Adopta_${edition}_1_0_0_21_${type}.zip`), "");
      }
      for (const file of ["SHA256SUMS.txt", "release.json"]) {
        fs.writeFileSync(path.join(directory, "release", file), "");
      }
      const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", `
function gh {
    $global:LASTEXITCODE = 0
    if ($args[0] -eq 'api') {
        if ($args -notcontains 'ref=refs/tags/v1.0.0.21' -or
            $args -notcontains "sha=$env:GITHUB_SHA") { throw 'Incorrect reserved tag or commit' }
        Add-Content -LiteralPath $env:PUBLISH_TEST_LOG -Value 'reserve'
        if ($env:PUBLISH_TEST_OUTCOME -eq 'tag-exists') { $global:LASTEXITCODE = 1 }
        return
    }
    if ($args[0] -eq 'release' -and $args[1] -eq 'create') {
        if ($args[2] -cne 'v1.0.0.21' -or $args -notcontains '--verify-tag' -or
            $args -notcontains 'Adopta 1.0.0.21') { throw 'Incorrect release version or unreserved tag' }
        Add-Content -LiteralPath $env:PUBLISH_TEST_LOG -Value 'create'
        return
    }
    if ($args[0] -eq 'release' -and $args[1] -eq 'edit') {
        if ($args[2] -cne 'v1.0.0.21') { throw 'Incorrect published tag' }
        Add-Content -LiteralPath $env:PUBLISH_TEST_LOG -Value 'publish'
        return
    }
    throw 'Unexpected GitHub command'
}
${publish}`], {
        cwd: directory,
        env: {
          ...process.env,
          GH_REPO: "example/repository",
          RELEASE_VERSION: "1.0.0.21",
          GITHUB_SHA: "a".repeat(40),
          GITHUB_STEP_SUMMARY: path.join(directory, "summary"),
          PUBLISH_TEST_LOG: path.join(directory, "commands"),
          PUBLISH_TEST_OUTCOME: outcome,
        },
        encoding: "utf8",
      });
      assert.ifError(result.error);
      const commands = fs.readFileSync(path.join(directory, "commands"), "utf8").trim().split(/\r?\n/);
      if (outcome === "success") {
        assert.equal(result.status, 0, result.stderr || result.stdout);
        assert.deepEqual(commands, ["reserve", "create", "publish"]);
        assert.match(fs.readFileSync(path.join(directory, "summary"), "utf8"), /releases\/tag\/v1\.0\.0\.21/);
      } else {
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Existing versions are never overwritten/);
        assert.deepEqual(commands, ["reserve"]);
      }
    }
  } finally { fs.rmSync(fixture, { recursive: true }); }
});
