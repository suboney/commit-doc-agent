import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyImpact } from "./impact-classifier.js";

test("classifyImpact routes API files to api_note", () => {
  const decision = classifyImpact([
    {
      path: "src/api/projects.ts",
      status: "modified",
      additions: 12,
      deletions: 4
    }
  ]);

  assert.equal(decision.shouldPublish, true);
  assert.equal(decision.docType, "api_note");
});

test("classifyImpact ignores empty file sets", () => {
  const decision = classifyImpact([]);

  assert.equal(decision.shouldPublish, false);
  assert.equal(decision.docType, "ignore");
});
