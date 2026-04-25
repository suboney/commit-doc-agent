import type {
  ChangedFile,
  CommitEvent,
  DocGenerationInput,
  DocGenerator,
  DocDecision,
  GeneratedDoc
} from "../core/types.js";
import { loadProjectDocSchema } from "../schema/doc-schema.js";
import {
  endpointSummary,
  endpointTitle,
  extractEndpointReferences,
  type EndpointReference,
  renderFeaturePage
} from "../templates/feature-page.js";

export class TemplateDocGenerator implements DocGenerator {
  constructor(private readonly repoPath?: string) {}

  async generate(input: DocGenerationInput): Promise<GeneratedDoc[]> {
    const schema = await loadProjectDocSchema(this.repoPath);

    return generateFeatureDoc(input.event, input.files, input.decision, schema);
  }
}

export function generateFeatureDoc(
  event: CommitEvent,
  files: ChangedFile[],
  decision: DocDecision,
  schema: string
): GeneratedDoc[] {
  const endpoints = extractEndpointReferences(files);

  if (endpoints.length > 0) {
    return endpoints.map((endpoint) => {
      const title = endpointTitle(endpoint);
      const summary = endpointSummary(endpoint, event.repo);

      return buildGeneratedDoc({
        event,
        files,
        decision,
        schema,
        title,
        summary,
        endpoint
      });
    });
  }

  const title = titleFromEvent(event, decision.docType, files);
  const summary = `This page documents ${title.toLowerCase()} based on ${files.length} relevant file${files.length === 1 ? "" : "s"} changed in ${event.repo}.`;

  return [
    buildGeneratedDoc({
      event,
      files,
      decision,
      schema,
      title,
      summary
    })
  ];
}

function buildGeneratedDoc(input: {
  event: CommitEvent;
  files: ChangedFile[];
  decision: DocDecision;
  schema: string;
  title: string;
  summary: string;
  endpoint?: EndpointReference;
}): GeneratedDoc {
  const { event, files, decision, schema, title, summary, endpoint } = input;

  return {
    title,
    docType: decision.docType === "ignore" ? "change_brief" : decision.docType,
    summary,
    contentMarkdown: renderFeaturePage({
      event,
      files,
      decision,
      title,
      summary,
      schema,
      endpoint
    }),
    source: {
      repo: event.repo,
      branch: event.branch,
      afterSha: event.afterSha,
      commitUrl: event.commitUrl
    }
  };
}

function titleFromEvent(
  event: CommitEvent,
  docType: DocDecision["docType"],
  files: ChangedFile[]
): string {
  const firstLine = event.message?.split("\n")[0]?.trim();

  if (firstLine && !isGenericCommitTitle(firstLine)) {
    return firstLine;
  }

  const fileTitle = titleFromFiles(files);

  if (fileTitle) {
    return fileTitle;
  }

  if (docType === "api_note") {
    return "API behavior changed";
  }

  if (docType === "runbook_update") {
    return "Operational behavior changed";
  }

  if (docType === "adr") {
    return "Architecture-impacting change";
  }

  return "Documented feature change";
}

function isGenericCommitTitle(value: string): boolean {
  return ["change", "changed", "update", "updates", "wip"].includes(value.toLowerCase());
}

function titleFromFiles(files: ChangedFile[]): string | undefined {
  const paths = files.map((file) => file.path);

  if (paths.some((path) => path.endsWith("package.json"))) {
    return "Project package configuration";
  }

  if (paths.some((path) => path === "src/index.ts" || path === "src/server.js")) {
    return "Server application entrypoint";
  }

  if (paths.some((path) => path.startsWith("test/"))) {
    return "Feature test coverage";
  }

  if (paths.some((path) => path.toLowerCase().includes("readme"))) {
    return "Project documentation";
  }

  return undefined;
}
