import type { ChangedFile } from "../core/types.js";

export const fixtureChangedFiles: ChangedFile[] = [
  {
    path: "src/api/projects.ts",
    status: "modified",
    additions: 34,
    deletions: 12,
    patch: "@@ -12,7 +12,11 @@ export async function listProjects(req) {"
  },
  {
    path: "src/auth/bearer-token.ts",
    status: "added",
    additions: 81,
    deletions: 0,
    patch: "@@ -0,0 +1,81 @@"
  },
  {
    path: "package-lock.json",
    status: "modified",
    additions: 240,
    deletions: 103
  }
];
