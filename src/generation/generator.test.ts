import assert from "node:assert/strict";
import { test } from "node:test";
import { generateFeatureDoc } from "./generator.js";
import type { ChangedFile, CommitEvent, DocDecision } from "../core/types.js";
import { defaultDocSchema } from "../schema/doc-schema.js";

test("generateFeatureDoc creates one feature page per route", () => {
  const docs = generateFeatureDoc(createEvent(), [createRouteFile()], createDecision(), defaultDocSchema);

  assert.deepEqual(
    docs.map((doc) => doc.title),
    ["Landing page route", "Health Check route"]
  );
  assert.match(docs[0].contentMarkdown, /### `GET \/`/);
  assert.match(docs[1].contentMarkdown, /### `GET \/health-check`/);
});

test("generateFeatureDoc preserves a planned target path for fallback updates", () => {
  const docs = generateFeatureDoc(
    createEvent(),
    [
      {
        path: "src/service.ts",
        status: "modified",
        additions: 3,
        deletions: 1,
        patch: "@@ -1,1 +1,1 @@"
      }
    ],
    {
      ...createDecision(),
      targetPath: "docs/service-feature.md"
    },
    defaultDocSchema
  );

  assert.equal(docs[0].targetPath, "docs/service-feature.md");
});

function createEvent(): CommitEvent {
  return {
    provider: "local_git",
    repo: "demo-project",
    branch: "main",
    beforeSha: "1111111111111111111111111111111111111111",
    afterSha: "2222222222222222222222222222222222222222",
    commitUrl: "local:/tmp/demo-project@2222222222222222222222222222222222222222",
    message: "init: server",
    occurredAt: "2026-04-24T00:00:00.000Z"
  };
}

function createDecision(): DocDecision {
  return {
    shouldPublish: true,
    docType: "change_brief",
    confidence: 0.9,
    reason: "Meaningful code changes were detected."
  };
}

function createRouteFile(): ChangedFile {
  return {
    path: "src/index.ts",
    status: "added",
    additions: 100,
    deletions: 0,
    patch: [
      '+  app.get("/", (_request, response) => {',
      '+    response.type("html").send(renderLandingPage(product));',
      '+  });',
      '+  app.get("/health-check", (_request, response) => {',
      '+    response.json({ ok: true });',
      '+  });'
    ].join("\n")
  };
}
