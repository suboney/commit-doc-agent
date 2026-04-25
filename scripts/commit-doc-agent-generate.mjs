import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(packageRoot, "dist/cli/index.js");
const repoPath = process.env.npm_config_repo || process.env.INIT_CWD || process.cwd();
const adapter = resolveAdapter();
const storePath =
  process.env.npm_config_store ||
  (adapter === "ollama" ? ".run-store/ollama-runs.json" : ".run-store/runs.json");
const outPath = resolveRepoPath(process.env.npm_config_out || "docs");

const args = [
  "local",
  "--repo",
  repoPath,
  "--ref",
  "HEAD",
  "--out",
  outPath,
  "--store",
  resolveRepoPath(storePath)
];

if (adapter !== "auto") {
  args.push("--adapter", adapter);
}

execFileSync("node", [cliPath, ...args], {
  cwd: packageRoot,
  stdio: "inherit",
  env: process.env
});

function resolveAdapter() {
  if (readBooleanFlag("ollama")) {
    return "ollama";
  }

  return process.env.npm_config_adapter || "auto";
}

function readBooleanFlag(name) {
  const value = process.env[`npm_config_${name}`];

  return value === "" || value === "true" || value === "1";
}

function resolveRepoPath(path) {
  return resolve(repoPath, path);
}
