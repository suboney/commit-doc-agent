import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DocClassificationInput,
  DocClassifier,
  DocDecision,
  DocGenerationInput,
  DocGenerator,
  DocType,
  GeneratedDoc
} from "../core/types.js";
import { loadProjectDocSchema } from "../schema/doc-schema.js";
import {
  endpointSummary,
  endpointTitle,
  extractEndpointReferences,
  type EndpointReference
} from "../templates/feature-page.js";
import type { LlmAdapter } from "./llm-adapter.js";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ModelGeneratedDoc = {
  title: string;
  docType: DocType;
  summary: string;
  contentMarkdown: string;
  targetPath?: string;
};

type ModelDocDecision = {
  shouldPublish: boolean;
  docType: DocType | "ignore";
  confidence: number;
  reason: string;
  targetPath?: string;
};

type ReferenceDocument = {
  path: string;
  content: string;
};

export class OllamaDocClassifier implements DocClassifier {
  constructor(
    private readonly baseUrl = "http://localhost:11434",
    private readonly model = "llama3.2",
    private readonly apiKey = "ollama",
    private readonly repoPath?: string,
    private readonly timeoutMs = 180_000
  ) {}

  async classify(input: DocClassificationInput): Promise<DocDecision> {
    try {
      const referenceContext = await loadReferenceContext(this.repoPath);
      const body = await requestChatCompletion({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        requestBody: buildDecisionRequestBody(this.model, input, referenceContext),
        format: ollamaDecisionSchema
      });

      return parseDocDecision(body, input.baselineDecision);
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error(
          [
            `Could not reach Ollama at ${this.baseUrl}.`,
            "Using the rule-based documentation decision fallback.",
            originalErrorMessage(error)
          ].join(" ")
        );
      }

      throw error;
    }
  }
}

export class OllamaDocGenerator implements DocGenerator, LlmAdapter {
  constructor(
    private readonly baseUrl = "http://localhost:11434",
    private readonly model = "llama3.2",
    private readonly apiKey = "ollama",
    private readonly repoPath?: string,
    private readonly timeoutMs = 180_000
  ) {}

  async generate(input: DocGenerationInput): Promise<GeneratedDoc[]> {
    try {
      const endpoints = extractEndpointReferences(input.files);

      if (endpoints.length > 0) {
        return Promise.all(
          endpoints.map((endpoint) => this.generateDocumentation(input, endpoint))
        );
      }

      return [await this.generateDocumentation(input)];
    } catch (error) {
      if (isFetchFailure(error)) {
        throw new Error(
          [
            `Could not reach Ollama at ${this.baseUrl}.`,
            "Start Ollama with `ollama serve`, pull the configured model, or unset OLLAMA_MODEL to use the template generator.",
            originalErrorMessage(error)
          ].join(" ")
        );
      }

      throw error;
    }
  }

  async generateDocumentation(
    input: DocGenerationInput,
    endpoint?: EndpointReference
  ): Promise<GeneratedDoc> {
    const docSchema = await loadProjectDocSchema(this.repoPath);
    const referenceContext = await loadReferenceContext(this.repoPath);
    const body = await requestChatCompletion({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      timeoutMs: this.timeoutMs,
      requestBody: buildChatRequestBody(
        this.model,
        input,
        referenceContext,
        docSchema,
        endpoint
      ),
      format: ollamaOutputSchema
    });
    const generated = parseGeneratedDoc(body);

    return {
      ...generated,
      targetPath: generated.targetPath ?? (!endpoint ? input.decision.targetPath : undefined),
      source: {
        repo: input.event.repo,
        branch: input.event.branch,
        afterSha: input.event.afterSha,
        commitUrl: input.event.commitUrl
      }
    };
  }

}

type OllamaChatRequestBody = {
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
};

type NativeOllamaChatRequestBody = {
  model: string;
  stream: false;
  format: typeof ollamaOutputSchema | typeof ollamaDecisionSchema;
  think: false;
  options: {
    temperature: number;
    num_predict: number;
  };
  messages: OllamaChatRequestBody["messages"];
};

async function requestChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  requestBody: OllamaChatRequestBody;
  format: NativeOllamaChatRequestBody["format"];
}): Promise<OllamaChatResponse> {
  const url = toNativeChatUrl(input.baseUrl);
  const headers = {
    Authorization: `Bearer ${input.apiKey}`,
    "Content-Type": "application/json"
  };
  const response = await fetch(url, {
    method: "POST",
    headers,
    signal: createTimeoutSignal(input.timeoutMs),
    body: JSON.stringify(toNativeChatRequestBody(input.requestBody, input.format))
  });

  return parseChatCompletionResponse(response);
}

function parseGeneratedDoc(response: OllamaChatResponse): ModelGeneratedDoc {
  const text = response.message?.content ?? response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Ollama response did not include message content.");
  }

  const parsed = JSON.parse(extractJson(text)) as unknown;
  const generated = normalizeModelGeneratedDoc(parsed);

  if (!generated) {
    throw new Error("Ollama response did not match the generated documentation contract.");
  }

  return generated;
}

function normalizeModelGeneratedDoc(value: unknown): ModelGeneratedDoc | undefined {
  if (isModelGeneratedDoc(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const contentMarkdown = firstString(
    record.contentMarkdown,
    record.markdown,
    record.content,
    record.documentation,
    renderSectionObject(record)
  );

  if (!contentMarkdown) {
    return undefined;
  }

  const title = firstString(record.title, record.name, headingFromMarkdown(contentMarkdown)) ??
    "Generated feature documentation";
  const summary = firstString(record.summary, record.description, firstParagraph(contentMarkdown)) ??
    `Documentation for ${title}.`;

  return {
    title,
    docType: isDocType(record.docType) ? record.docType : "change_brief",
    summary,
    contentMarkdown,
    targetPath: firstString(
      record.targetPath,
      record.target_path,
      record.existingDocPath,
      record.existing_doc_path
    )
  };
}

function parseDocDecision(
  response: OllamaChatResponse,
  fallback: DocDecision
): DocDecision {
  const text = response.message?.content ?? response.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Ollama decision response did not include message content.");
  }

  const parsed = JSON.parse(extractJson(text)) as unknown;

  if (!isModelDocDecision(parsed)) {
    throw new Error("Ollama response did not match the documentation decision contract.");
  }

  return {
    shouldPublish: parsed.shouldPublish,
    docType: parsed.docType,
    confidence: clampConfidence(parsed.confidence),
    reason: parsed.reason,
    targetPath: parsed.targetPath ?? fallback.targetPath
  };
}

function buildChatRequestBody(
  model: string,
  input: DocGenerationInput,
  referenceContext: { docs: ReferenceDocument[]; reports: ReferenceDocument[] },
  docSchema: string,
  endpoint?: EndpointReference
): OllamaChatRequestBody {
  return {
    model,
    temperature: 0.2,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content: [
          "/no_think",
          "You write concise engineering documentation from git changes.",
          "Think privately if needed, but do not include chain-of-thought or reasoning.",
          "Return exactly one JSON object matching the provided response schema.",
          "docType must be one of: change_brief, api_note, runbook_update, adr.",
          "Return only documentation justified by the commit metadata and file changes.",
          "Do not invent business context, product names, owners, incidents, or deployment steps.",
          "Do not echo the input schema, prompt, commit metadata, or file list.",
          "Generate a feature documentation page, not a commit summary.",
          "Follow the provided project documentation schema as the page contract.",
          "The page must include Purpose, Getting Started, Reference, and Source Notes sections.",
          "Getting Started must link to the Reference section with [Reference](#reference).",
          "Reference must document public methods, endpoints, commands, components, configuration, or exported types exposed by the feature when visible in the diff.",
          "If existing docs or hidden report metadata are provided, use them as local reference context and avoid contradicting them without commit evidence.",
          "If this commit changes an already documented feature, update that documentation instead of creating a duplicate page.",
          "When updating an existing doc, set targetPath to that existing docs/*.md path.",
          "Markdown must use headings and bullets only.",
          "The response must be exactly one JSON object and no surrounding prose."
        ].join(" ")
      },
      {
        role: "user",
        content: renderUserPrompt({
          docSchema,
          event: input.event,
          decision: input.decision,
          files: input.files,
          referenceContext,
          endpoint
        })
      }
    ]
  };
}

function renderUserPrompt(input: {
  docSchema: string;
  event: DocGenerationInput["event"];
  decision: DocGenerationInput["decision"];
  files: DocGenerationInput["files"];
  referenceContext: { docs: ReferenceDocument[]; reports: ReferenceDocument[] };
  endpoint?: EndpointReference;
}): string {
  const featureFocus = input.endpoint
    ? [
        `Feature focus: ${input.endpoint.method} ${input.endpoint.route}`,
        `Preferred title: ${endpointTitle(input.endpoint)}`,
        `Preferred summary: ${endpointSummary(input.endpoint, input.event.repo)}`
      ]
    : ["Feature focus: infer the primary feature from the changed files."];

  return [
    "Generate a feature documentation page for this commit.",
    ...featureFocus,
    "",
    "Project documentation schema:",
    input.docSchema,
    "",
    "Commit metadata:",
    `- Repository: ${input.event.repo}`,
    `- Branch: ${input.event.branch}`,
    `- Commit: ${input.event.afterSha}`,
    `- Commit URL: ${input.event.commitUrl}`,
    `- Message: ${input.event.message ?? "No commit message provided."}`,
    `- Documentation decision: ${input.decision.docType}`,
    `- Decision reason: ${input.decision.reason}`,
    `- Existing target doc selected by planner: ${input.decision.targetPath ?? "None."}`,
    "",
    "Changed files:",
    ...input.files.map((file) =>
      [
        `- ${file.path} (${file.status}, +${file.additions}/-${file.deletions})`,
        truncate(file.patch ?? "No patch available.", 3000)
      ].join("\n")
    ),
    "",
    "Existing project docs for context:",
    renderReferenceContext(input.referenceContext.docs),
    "",
    "Latest hidden report metadata for context:",
    renderReferenceContext(input.referenceContext.reports),
    "",
    "Return only the output JSON object. Use the exact local commit URL above if you mention the source."
  ].join("\n");
}

function buildDecisionRequestBody(
  model: string,
  input: DocClassificationInput,
  referenceContext: { docs: ReferenceDocument[]; reports: ReferenceDocument[] }
): OllamaChatRequestBody {
  return {
    model,
    temperature: 0,
    maxTokens: 700,
    messages: [
      {
        role: "system",
        content: [
          "/no_think",
          "You are a documentation planning agent for a local git repository.",
          "Decide whether a commit changes a user-facing feature, API, command, route, configuration contract, operational behavior, or architecture decision that should be documented.",
          "Skip noisy commits, generated docs, lockfiles, formatting-only changes, package metadata with no user-facing behavior, and internal churn that does not affect how someone uses or maintains a feature.",
          "If an existing doc already covers the changed feature, choose that doc as targetPath so it can be updated instead of duplicated.",
          "Return exactly one JSON object matching the response schema.",
          "Do not include chain-of-thought or prose outside JSON."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          "Plan documentation for this commit.",
          "",
          "Baseline rule decision:",
          `- shouldPublish: ${input.baselineDecision.shouldPublish}`,
          `- docType: ${input.baselineDecision.docType}`,
          `- confidence: ${input.baselineDecision.confidence}`,
          `- reason: ${input.baselineDecision.reason}`,
          "",
          "Commit metadata:",
          `- Repository: ${input.event.repo}`,
          `- Branch: ${input.event.branch}`,
          `- Commit: ${input.event.afterSha}`,
          `- Message: ${input.event.message ?? "No commit message provided."}`,
          "",
          "Changed files:",
          ...input.files.map((file) =>
            [
              `- ${file.path} (${file.status}, +${file.additions}/-${file.deletions})`,
              truncate(file.patch ?? "No patch available.", 2500)
            ].join("\n")
          ),
          "",
          "Existing project docs. If one should be updated, return its path as targetPath:",
          renderReferenceContext(referenceContext.docs),
          "",
          "Latest hidden report metadata:",
          renderReferenceContext(referenceContext.reports),
          "",
          "Return fields: shouldPublish, docType, confidence, reason, optional targetPath."
        ].join("\n")
      }
    ]
  };
}

function extractJson(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function isModelGeneratedDoc(value: unknown): value is ModelGeneratedDoc {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.title === "string" &&
    isDocType(record.docType) &&
    typeof record.summary === "string" &&
    typeof record.contentMarkdown === "string"
  );
}

function isModelDocDecision(value: unknown): value is ModelDocDecision {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.shouldPublish === "boolean" &&
    isDecisionDocType(record.docType) &&
    typeof record.confidence === "number" &&
    typeof record.reason === "string" &&
    (record.targetPath === undefined || typeof record.targetPath === "string")
  );
}

function isDocType(value: unknown): value is DocType {
  return (
    value === "change_brief" ||
    value === "api_note" ||
    value === "runbook_update" ||
    value === "adr"
  );
}

function isDecisionDocType(value: unknown): value is DocType | "ignore" {
  return isDocType(value) || value === "ignore";
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function renderSectionObject(record: Record<string, unknown>): string | undefined {
  const purpose = firstString(record.purpose);
  const gettingStarted = firstString(record.gettingStarted, record.getting_started);
  const reference = firstString(record.reference);
  const sourceNotes = firstString(record.sourceNotes, record.source_notes);

  if (!purpose && !gettingStarted && !reference && !sourceNotes) {
    return undefined;
  }

  return [
    `# ${firstString(record.title, record.name) ?? "Generated feature documentation"}`,
    "",
    "## Purpose",
    "",
    purpose ?? "Purpose was not provided by the model.",
    "",
    "## Getting Started",
    "",
    gettingStarted ?? "See [Reference](#reference) for the public surface.",
    "",
    "## Reference",
    "",
    reference ?? "No public reference details were provided by the model.",
    "",
    "## Source Notes",
    "",
    sourceNotes ?? "Review the changed files for source details."
  ].join("\n");
}

function headingFromMarkdown(markdown: string): string | undefined {
  return markdown
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();
}

function firstParagraph(markdown: string): string | undefined {
  return markdown
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .find((section) => section && !section.startsWith("#"));
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[truncated]`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function toNativeChatRequestBody(
  requestBody: OllamaChatRequestBody,
  format: NativeOllamaChatRequestBody["format"]
): NativeOllamaChatRequestBody {
  return {
    model: requestBody.model,
    stream: false,
    format,
    think: false,
    options: {
      temperature: requestBody.temperature,
      num_predict: requestBody.maxTokens
    },
    messages: requestBody.messages
  };
}

const ollamaOutputSchema = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    docType: {
      type: "string",
      enum: ["change_brief", "api_note", "runbook_update", "adr"]
    },
    summary: {
      type: "string"
    },
    contentMarkdown: {
      type: "string"
    },
    targetPath: {
      type: "string"
    }
  },
  required: ["title", "docType", "summary", "contentMarkdown"]
} as const;

const ollamaDecisionSchema = {
  type: "object",
  properties: {
    shouldPublish: {
      type: "boolean"
    },
    docType: {
      type: "string",
      enum: ["change_brief", "api_note", "runbook_update", "adr", "ignore"]
    },
    confidence: {
      type: "number"
    },
    reason: {
      type: "string"
    },
    targetPath: {
      type: "string"
    }
  },
  required: ["shouldPublish", "docType", "confidence", "reason"]
} as const;

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function renderReferenceContext(documents: ReferenceDocument[]): string {
  if (documents.length === 0) {
    return "None.";
  }

  return documents
    .map((document) =>
      [`### ${document.path}`, truncate(document.content, 3000)].join("\n")
    )
    .join("\n\n");
}

function toNativeChatUrl(baseUrl: string): string {
  const trimmed = trimTrailingSlash(baseUrl);

  if (trimmed.endsWith("/api/chat")) {
    return trimmed;
  }

  if (trimmed.endsWith("/api")) {
    return `${trimmed}/chat`;
  }

  if (trimmed.endsWith("/v1")) {
    return `${trimmed.slice(0, -3)}/api/chat`;
  }

  return `${trimmed}/api/chat`;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();

  setTimeout(() => controller.abort(), timeoutMs).unref();

  return controller.signal;
}

async function parseChatCompletionResponse(response: Response): Promise<OllamaChatResponse> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as OllamaChatResponse;
}

async function loadReferenceContext(
  repoPath?: string
): Promise<{ docs: ReferenceDocument[]; reports: ReferenceDocument[] }> {
  if (!repoPath) {
    return {
      docs: [],
      reports: []
    };
  }

  const docs = await loadCurrentDocs(repoPath);
  const reports = await loadLatestReport(repoPath);

  return {
    docs,
    reports
  };
}

async function loadCurrentDocs(repoPath: string): Promise<ReferenceDocument[]> {
  try {
    const docsDir = resolve(repoPath, "docs");
    const entries = await readdir(docsDir, { withFileTypes: true });
    const docFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 12);

    return Promise.all(
      docFiles.map(async (entry) => ({
        path: `docs/${entry.name}`,
        content: truncate(await readFile(resolve(docsDir, entry.name), "utf8"), 8000)
      }))
    );
  } catch {
    return [];
  }
}

async function loadLatestReport(repoPath: string): Promise<ReferenceDocument[]> {
  try {
    const reportPath = resolve(repoPath, "docs", ".reports", "latest.md");
    const content = await readFile(reportPath, "utf8");

    return [
      {
        path: "docs/.reports/latest.md",
        content: truncate(content, 8000)
      }
    ];
  } catch {
    return [];
  }
}

function isFetchFailure(error: unknown): boolean {
  return error instanceof TypeError && error.message === "fetch failed";
}

function originalErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    error.cause instanceof Error
  ) {
    return `Original error: ${error.cause.message}`;
  }

  return "";
}
