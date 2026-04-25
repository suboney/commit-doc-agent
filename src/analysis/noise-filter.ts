import type { ChangedFile } from "../core/types.js";

const ignoredExactPaths = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb"
]);

const ignoredExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".snap"
];

const ignoredDirectories = [
  "dist",
  "build",
  "coverage",
  "node_modules",
  "__snapshots__"
];

const ignoredTopLevelDirectories = ["docs", "reports", ".run-store"];

export function filterNoise(files: ChangedFile[]): ChangedFile[] {
  return files.filter((file) => !isNoisyFile(file));
}

function isNoisyFile(file: ChangedFile): boolean {
  const path = file.path.toLowerCase();

  if (ignoredExactPaths.has(path)) {
    return true;
  }

  if (ignoredExtensions.some((extension) => path.endsWith(extension))) {
    return true;
  }

  if (ignoredDirectories.some((directory) => isInDirectory(path, directory))) {
    return true;
  }

  if (ignoredTopLevelDirectories.some((directory) => isInTopLevelDirectory(path, directory))) {
    return true;
  }

  if (isDocumentationMetadataPath(path)) {
    return true;
  }

  return file.additions === 0 && file.deletions === 0;
}

function isInDirectory(path: string, directory: string): boolean {
  return (
    path === directory ||
    path.startsWith(`${directory}/`) ||
    path.includes(`/${directory}/`)
  );
}

function isInTopLevelDirectory(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

function isDocumentationMetadataPath(path: string): boolean {
  return path === "docs/.reports" || path.startsWith("docs/.reports/");
}
