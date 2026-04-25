import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultStorePathForAdapter } from "./adapter-defaults.js";

test("defaultStorePathForAdapter uses a dedicated store for Ollama runs", () => {
  assert.equal(defaultStorePathForAdapter("auto"), ".run-store/runs.json");
  assert.equal(defaultStorePathForAdapter("template"), ".run-store/runs.json");
  assert.equal(defaultStorePathForAdapter("ollama"), ".run-store/ollama-runs.json");
});
