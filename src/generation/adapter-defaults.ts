import type { GeneratorAdapter } from "./create-generator.js";

export function defaultStorePathForAdapter(adapter: GeneratorAdapter): string {
  if (adapter === "ollama") {
    return ".run-store/ollama-runs.json";
  }

  return ".run-store/runs.json";
}
