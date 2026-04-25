import type { DocGenerationInput, DocGenerator, GeneratedDoc } from "../core/types.js";

type FallbackReporter = (error: unknown) => void;

export class FallbackDocGenerator implements DocGenerator {
  constructor(
    private readonly primary: DocGenerator,
    private readonly fallback: DocGenerator,
    private readonly reportFallback: FallbackReporter = defaultReporter
  ) {}

  async generate(input: DocGenerationInput): Promise<GeneratedDoc[]> {
    try {
      return await this.primary.generate(input);
    } catch (error) {
      this.reportFallback(error);

      return this.fallback.generate(input);
    }
  }
}

function defaultReporter(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Ollama generation failed; using template documentation fallback. ${message}`);
}
