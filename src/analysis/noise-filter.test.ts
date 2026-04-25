import assert from "node:assert/strict";
import { test } from "node:test";
import { filterNoise } from "./noise-filter.js";
import type { ChangedFile } from "../core/types.js";

test("filterNoise removes generated artifacts, lockfiles, and binary assets", () => {
  const files: ChangedFile[] = [
    {
      path: "src/api/projects.ts",
      status: "modified",
      additions: 5,
      deletions: 2
    },
    {
      path: "package-lock.json",
      status: "modified",
      additions: 100,
      deletions: 20
    },
    {
      path: "public/logo.png",
      status: "modified",
      additions: 1,
      deletions: 1
    },
    {
      path: "docs/.reports/latest.md",
      status: "modified",
      additions: 40,
      deletions: 10
    },
    {
      path: "docs/update-299e3b4.md",
      status: "modified",
      additions: 33,
      deletions: 0
    },
    {
      path: ".run-store/runs.json",
      status: "modified",
      additions: 2,
      deletions: 1
    },
    {
      path: "dist/cli/index.js",
      status: "modified",
      additions: 25,
      deletions: 5
    }
  ];

  assert.deepEqual(
    filterNoise(files).map((file) => file.path),
    ["src/api/projects.ts"]
  );
});
