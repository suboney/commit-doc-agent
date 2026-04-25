import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { installPostCommitHook, resolveGitRepoRoot } from "../git/local-git.js";
import { defaultStorePathForAdapter } from "../generation/adapter-defaults.js";
import { ensureProjectDocSchema } from "../schema/doc-schema.js";
import type { GeneratorAdapter } from "../generation/create-generator.js";

const defaultDocsDir = "docs";
const defaultIgnoreEntries = ["docs/.reports/", ".run-store/"];

export type SetupLocalProjectResult = {
  repoRoot: string;
  docsDir: string;
  storePath: string;
  hookPath: string;
  addedIgnoreEntries: string[];
};

type SetupLocalProjectOptions = {
  adapter?: GeneratorAdapter;
};

export async function setupLocalProject(
  repoPath: string,
  cliScriptPath: string,
  options: SetupLocalProjectOptions = {}
): Promise<SetupLocalProjectResult> {
  const repoRoot = await resolveGitRepoRoot(repoPath);
  const docsDir = resolve(repoRoot, defaultDocsDir);
  const adapter = options.adapter ?? "auto";
  const storePath = resolve(repoRoot, defaultStorePathForAdapter(adapter));

  await mkdir(docsDir, { recursive: true });
  await mkdir(dirname(storePath), { recursive: true });
  await ensureProjectDocSchema(repoRoot);

  const addedIgnoreEntries = await ensureGitignoreEntries(repoRoot, defaultIgnoreEntries);
  const hookPath = await installPostCommitHook(repoRoot, {
    fallbackScriptPath: cliScriptPath,
    ref: "HEAD",
    outDir: defaultDocsDir,
    storePath: defaultStorePathForAdapter(adapter),
    adapter: adapter === "auto" ? undefined : adapter
  });

  return {
    repoRoot,
    docsDir,
    storePath,
    hookPath,
    addedIgnoreEntries
  };
}

async function ensureGitignoreEntries(repoRoot: string, entries: string[]): Promise<string[]> {
  const gitignorePath = resolve(repoRoot, ".gitignore");
  let existing = "";

  try {
    existing = await readFile(gitignorePath, "utf8");
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }

  const existingLines = existing.split(/\r?\n/).map((line) => line.trim());
  const missingEntries = entries.filter((entry) => !existingLines.includes(entry));

  if (missingEntries.length === 0) {
    return [];
  }

  const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  const next = `${existing}${prefix}${missingEntries.join("\n")}\n`;
  await writeFile(gitignorePath, next, "utf8");

  return missingEntries;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
