import assert from "node:assert/strict";
import { test } from "node:test";
import type { DocGenerationInput, DocGenerator, GeneratedDoc } from "../core/types.js";
import { FallbackDocGenerator } from "./fallback-generator.js";

test("FallbackDocGenerator uses the fallback when the primary generator fails", async () => {
  const warnings: unknown[] = [];
  const generator = new FallbackDocGenerator(
    {
      async generate() {
        throw new Error("Ollama request failed: 500 model overloaded");
      }
    },
    new StaticDocGenerator(),
    (error) => warnings.push(error)
  );

  const docs = await generator.generate(createGenerationInput());

  assert.equal(docs[0].title, "Fallback feature docs");
  assert.equal(warnings.length, 1);
});

class StaticDocGenerator implements DocGenerator {
  async generate(input: DocGenerationInput): Promise<GeneratedDoc[]> {
    return [{
      title: "Fallback feature docs",
      docType: "change_brief",
      summary: "Fallback summary.",
      contentMarkdown: "# Fallback feature docs\n",
      source: {
        repo: input.event.repo,
        branch: input.event.branch,
        afterSha: input.event.afterSha,
        commitUrl: input.event.commitUrl
      }
    }];
  }
}

function createGenerationInput(): DocGenerationInput {
  return {
    event: {
      provider: "local_git",
      repo: "demo-project",
      branch: "main",
      beforeSha: "1111111111111111111111111111111111111111",
      afterSha: "2222222222222222222222222222222222222222",
      commitUrl: "local:/tmp/demo-project@2222222222222222222222222222222222222222",
      occurredAt: "2026-04-24T00:00:00.000Z"
    },
    decision: {
      shouldPublish: true,
      docType: "change_brief",
      confidence: 0.8,
      reason: "Meaningful code changes were detected."
    },
    files: []
  };
}
