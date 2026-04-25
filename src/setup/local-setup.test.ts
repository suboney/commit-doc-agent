import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { setupLocalProject } from "./local-setup.js";

const execFileAsync = promisify(execFile);

test("setupLocalProject prepares a repo for automatic local docs", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "commit-doc-agent-setup-"));

  try {
    await execFileAsync("git", ["init"], { cwd: repoRoot });

    const result = await setupLocalProject(repoRoot, "/tmp/fake-cli.js");
    const gitignore = await readFile(resolve(repoRoot, ".gitignore"), "utf8");
    const hook = await readFile(resolve(repoRoot, ".git", "hooks", "post-commit"), "utf8");
    const schema = await readFile(resolve(repoRoot, "docs", ".schema", "feature-page.md"), "utf8");

    assert.match(result.repoRoot, /commit-doc-agent-setup-/);
    assert.equal(result.docsDir, resolve(result.repoRoot, "docs"));
    assert.equal(result.storePath, resolve(result.repoRoot, ".run-store", "runs.json"));
    assert.deepEqual(result.addedIgnoreEntries, ["docs/.reports/", ".run-store/"]);
    assert.match(gitignore, /docs\/\.reports\//);
    assert.match(gitignore, /\.run-store\//);
    assert.match(schema, /Feature Page Schema/);
    assert.match(schema, /## Required Page Shape/);
    assert.match(hook, /\.\/node_modules\/\.bin\/commit-doc-agent/);
    assert.match(hook, /command -v commit-doc-agent/);
    assert.match(hook, /node "(?:\.\.\/)+tmp\/fake-cli\.js" "\$@"/);
    assert.match(hook, /run_commit_doc_agent local/);
    assert.match(hook, /--repo "\."/);
    assert.match(hook, /--out "docs"/);
    assert.match(hook, /--store ".run-store\/runs\.json"/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("setupLocalProject can prepare an Ollama-based hook", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "commit-doc-agent-setup-ollama-"));

  try {
    await execFileAsync("git", ["init"], { cwd: repoRoot });

    const result = await setupLocalProject(repoRoot, "/tmp/fake-cli.js", {
      adapter: "ollama"
    });
    const hook = await readFile(resolve(repoRoot, ".git", "hooks", "post-commit"), "utf8");

    assert.equal(result.storePath, resolve(result.repoRoot, ".run-store", "ollama-runs.json"));
    assert.match(hook, /--store ".run-store\/ollama-runs\.json"/);
    assert.match(hook, /--adapter "ollama"/);
    assert.match(hook, /\.\/node_modules\/\.bin\/commit-doc-agent/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("setupLocalProject writes a relative fallback path when the CLI lives near the repo", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "commit-doc-agent-relative-"));
  const repoRoot = resolve(workspaceRoot, "demo-project");
  const cliPath = resolve(workspaceRoot, "dist", "cli", "index.js");

  try {
    await execFileAsync("mkdir", ["-p", repoRoot]);
    await execFileAsync("git", ["init"], { cwd: repoRoot });

    const result = await setupLocalProject(repoRoot, cliPath);
    const hook = await readFile(resolve(repoRoot, ".git", "hooks", "post-commit"), "utf8");

    assert.equal(result.docsDir, resolve(result.repoRoot, "docs"));
    assert.match(hook, /node "\.\.\/dist\/cli\/index\.js" "\$@"/);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
