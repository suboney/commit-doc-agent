import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  defaultDocSchema,
  docSchemaRelativePath,
  ensureProjectDocSchema,
  loadProjectDocSchema
} from "./doc-schema.js";

test("ensureProjectDocSchema copies the default editable schema once", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "commit-doc-agent-schema-"));

  try {
    const schemaPath = await ensureProjectDocSchema(repoRoot);
    const content = await readFile(schemaPath, "utf8");

    assert.equal(schemaPath, resolve(repoRoot, docSchemaRelativePath));
    assert.equal(content, defaultDocSchema);
    assert.match(content, /## Required Page Shape/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("loadProjectDocSchema preserves project edits", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "commit-doc-agent-schema-edit-"));
  const schemaPath = resolve(repoRoot, docSchemaRelativePath);
  const customSchema = "# Custom Project Schema\n\nUse project-specific sections.\n";

  try {
    await ensureProjectDocSchema(repoRoot);
    await writeFile(schemaPath, customSchema, "utf8");

    assert.equal(await loadProjectDocSchema(repoRoot), customSchema);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
