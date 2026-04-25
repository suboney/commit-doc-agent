import type { DocClassifier, DocGenerator } from "../core/types.js";
import { OllamaDocClassifier, OllamaDocGenerator } from "../llm/ollama-adapter.js";
import { FallbackDocGenerator } from "./fallback-generator.js";
import { TemplateDocGenerator } from "./generator.js";

export type GeneratorAdapter = "auto" | "template" | "ollama";

export function createDocGenerator(
  repoPath?: string,
  adapter: GeneratorAdapter = "auto"
): DocGenerator {
  if (adapter === "template") {
    return new TemplateDocGenerator(repoPath);
  }

  if (adapter === "ollama" || process.env.OLLAMA_MODEL) {
    return new FallbackDocGenerator(
      new OllamaDocGenerator(
        process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
        process.env.OLLAMA_MODEL ?? "qwen3:4b",
        process.env.OLLAMA_API_KEY ?? "ollama",
        repoPath,
        parseOllamaTimeout(process.env.OLLAMA_TIMEOUT_MS)
      ),
      new TemplateDocGenerator(repoPath)
    );
  }

  return new TemplateDocGenerator(repoPath);
}

export function createDocClassifier(
  repoPath?: string,
  adapter: GeneratorAdapter = "auto"
): DocClassifier | undefined {
  if (adapter !== "ollama" && !process.env.OLLAMA_MODEL) {
    return undefined;
  }

  return new FallbackDocClassifier(
    new OllamaDocClassifier(
      process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      process.env.OLLAMA_MODEL ?? "qwen3:4b",
      process.env.OLLAMA_API_KEY ?? "ollama",
      repoPath,
      parseOllamaTimeout(process.env.OLLAMA_TIMEOUT_MS)
    )
  );
}

class FallbackDocClassifier implements DocClassifier {
  constructor(private readonly primary: DocClassifier) {}

  async classify(input: Parameters<DocClassifier["classify"]>[0]) {
    try {
      return await this.primary.classify(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Ollama documentation planning failed; using rule-based fallback. ${message}`);

      return input.baselineDecision;
    }
  }
}

function parseOllamaTimeout(value: string | undefined): number {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 180_000;
}

export function isGeneratorAdapter(value: string): value is GeneratorAdapter {
  return value === "auto" || value === "template" || value === "ollama";
}
