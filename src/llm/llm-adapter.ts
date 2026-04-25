import type { DocGenerationInput, GeneratedDoc } from "../core/types.js";

export type LlmAdapter = {
  generateDocumentation(input: DocGenerationInput): Promise<GeneratedDoc>;
};
