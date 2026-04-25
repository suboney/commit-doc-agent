import assert from "node:assert/strict";
import { test } from "node:test";
import type { DocClassificationInput, DocGenerationInput } from "../core/types.js";
import { OllamaDocClassifier, OllamaDocGenerator } from "./ollama-adapter.js";

test("OllamaDocGenerator uses Ollama native JSON chat endpoint", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    urls.push(String(input));
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(body);

    return new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify({
            title: "Generated feature docs",
            docType: "change_brief",
            summary: "A short summary.",
            contentMarkdown: "# Generated feature docs\n\n## Purpose\n\n- Detail\n",
            targetPath: "docs/generated-feature-docs.md"
          })
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  try {
    const generator = new OllamaDocGenerator("http://localhost:11434/v1");
    const generated = await generator.generate(createGenerationInput());

    assert.equal(urls[0], "http://localhost:11434/api/chat");
    assert.equal(calls.length, 1);
    assert.equal((calls[0].format as { type: string }).type, "object");
    assert.equal(calls[0].think, false);
    assert.equal(calls[0].stream, false);
    assert.deepEqual(calls[0].options, {
      temperature: 0.2,
      num_predict: 1200
    });
    assert.match(JSON.stringify(calls[0]), /Generate a feature documentation page/);
    assert.match(JSON.stringify(calls[0]), /Feature Page Schema/);
    assert.doesNotMatch(JSON.stringify(calls[0]), /response_format/);
    assert.equal(generated[0].title, "Generated feature docs");
    assert.equal(generated[0].targetPath, "docs/generated-feature-docs.md");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OllamaDocClassifier can select an existing doc for update", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(body);

    return new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify({
            shouldPublish: true,
            docType: "api_note",
            confidence: 0.91,
            reason: "The route contract changed and existing docs should be updated.",
            targetPath: "docs/landing-page-route.md"
          })
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  try {
    const classifier = new OllamaDocClassifier();
    const decision = await classifier.classify(createClassificationInput());

    assert.equal(calls.length, 1);
    assert.equal((calls[0].format as { type: string }).type, "object");
    assert.match(JSON.stringify(calls[0]), /Plan documentation for this commit/);
    assert.equal(decision.shouldPublish, true);
    assert.equal(decision.docType, "api_note");
    assert.equal(decision.targetPath, "docs/landing-page-route.md");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OllamaDocGenerator reports native Ollama failures", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: "model returned a 500"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  try {
    const generator = new OllamaDocGenerator();

    await assert.rejects(
      () => generator.generate(createGenerationInput()),
      /Ollama request failed: 500/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OllamaDocGenerator supports OpenAI-style native response fallback", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "OpenAI style feature docs",
                docType: "change_brief",
                summary: "A short summary.",
                contentMarkdown: "# OpenAI style feature docs\n"
              })
            }
          }
        ]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  try {
    const generator = new OllamaDocGenerator();
    const generated = await generator.generate(createGenerationInput());

    assert.equal(generated[0].title, "OpenAI style feature docs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OllamaDocGenerator normalizes schema-like model output", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify({
            name: "Gitignore lockfile configuration",
            markdown: "# Gitignore lockfile configuration\n\n## Purpose\n\nIgnore npm lockfiles.\n"
          })
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  try {
    const generator = new OllamaDocGenerator();
    const generated = await generator.generate(createGenerationInput());

    assert.equal(generated[0].title, "Gitignore lockfile configuration");
    assert.equal(generated[0].docType, "change_brief");
    assert.match(generated[0].contentMarkdown, /## Purpose/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createGenerationInput(): DocGenerationInput {
  return {
    event: {
      provider: "local_git",
      repo: "demo-project",
      branch: "main",
      beforeSha: "1111111111111111111111111111111111111111",
      afterSha: "2222222222222222222222222222222222222222",
      commitUrl: "local:/tmp/demo-project@2222222222222222222222222222222222222222",
      message: "Update project endpoint",
      occurredAt: "2026-04-24T00:00:00.000Z"
    },
    decision: {
      shouldPublish: true,
      docType: "change_brief",
      confidence: 0.9,
      reason: "Meaningful code changes were detected."
    },
    files: [
      {
        path: "src/server.js",
        status: "modified",
        additions: 12,
        deletions: 3,
        patch: "@@ -1,1 +1,1 @@"
      }
    ]
  };
}

function createClassificationInput(): DocClassificationInput {
  const generationInput = createGenerationInput();

  return {
    event: generationInput.event,
    files: generationInput.files,
    baselineDecision: generationInput.decision
  };
}
