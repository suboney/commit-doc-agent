import type { CommitEvent } from "../core/types.js";

export function createFixtureCommitEvent(): CommitEvent {
  return {
    provider: "fixture",
    repo: "demo-service",
    branch: "main",
    beforeSha: "2ad78f6c3b9c0d8b5bb54c67d57c2fb8262a2f20",
    afterSha: "9b84d2e9a07f1012bbfa774aee7f06e2b07cf1ac",
    commitUrl: "fixture:demo-service@9b84d2e9a07f1012bbfa774aee7f06e2b07cf1ac",
    authorName: "Demo Developer",
    authorEmail: "demo@example.com",
    message: "Require bearer token auth for project API",
    occurredAt: "2026-04-24T18:00:00.000Z"
  };
}
