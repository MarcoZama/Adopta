import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateDualFormatSource } from "../deploy/prepare-solution.mjs";

test("offline packaging rejects incomplete or mismatched native managed metadata", () => {
  const parent = path.resolve(".solution-build");
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, "both-source-"));
  try {
    const form = path.join(fixture, "Entities", "example", "FormXml", "main", "form.xml");
    const managed = form.replace(/\.xml$/, "_managed.xml");
    const manifest = path.join(fixture, "Other", "Solution.xml");
    fs.mkdirSync(path.dirname(form), { recursive: true });
    fs.mkdirSync(path.dirname(manifest));
    fs.writeFileSync(manifest, "<Managed>0</Managed>");
    assert.throws(() => validateDualFormatSource(fixture), /Expected native Both/);
    fs.writeFileSync(manifest, "<Managed>2</Managed>");
    fs.writeFileSync(form, "<forms><systemform><formid>original</formid></systemform></forms>");
    assert.throws(() => validateDualFormatSource(fixture), /Missing native form counterpart/);
    fs.writeFileSync(managed, "<forms><systemform><formid>wrong</formid></systemform></forms>");
    assert.throws(() => validateDualFormatSource(fixture), /Mismatched managed\/unmanaged form IDs/);
    fs.writeFileSync(managed, fs.readFileSync(form));
    validateDualFormatSource(fixture);
    fs.unlinkSync(form);
    assert.throws(() => validateDualFormatSource(fixture), /Missing native form counterpart/);
  } finally { fs.rmSync(fixture, { recursive: true }); }
});
