import type { ChangedFile, CommitEvent, DocDecision } from "../core/types.js";

type RenderFeaturePageInput = {
  event: CommitEvent;
  files: ChangedFile[];
  decision: DocDecision;
  title: string;
  summary: string;
  schema: string;
  endpoint?: EndpointReference;
};

export type EndpointReference = {
  method: string;
  route: string;
};

export function renderFeaturePage(input: RenderFeaturePageInput): string {
  const endpoints = input.endpoint ? [input.endpoint] : extractEndpointReferences(input.files);
  const reference = endpoints.length > 0
    ? renderEndpointReference(endpoints)
    : renderFileReference(input.files);

  return [
    `# ${input.title}`,
    "",
    "## Purpose",
    "",
    input.summary,
    "",
    `This feature was documented from commit \`${input.event.afterSha.slice(0, 12)}\` on \`${input.event.branch}\`. The generated page follows the project schema at \`docs/.schema/feature-page.md\`.`,
    "",
    "## Getting Started",
    "",
    "- Review the changed files listed in [Source Notes](#source-notes) to understand the implementation surface.",
    "- Run the project checks or focused endpoint tests that cover the changed behavior.",
    "- Use the public surface described in [Reference](#reference) as the entry point for this feature.",
    "",
    "## Reference",
    "",
    reference,
    "",
    "## Source Notes",
    "",
    `- Repository: ${input.event.repo}`,
    `- Branch: ${input.event.branch}`,
    `- Commit: ${input.event.afterSha}`,
    `- Commit URL: ${input.event.commitUrl}`,
    `- Documentation decision: ${input.decision.docType} at ${Math.round(input.decision.confidence * 100)}% confidence`,
    "",
    "### Changed Files",
    "",
    ...input.files.map(
      (file) => `- \`${file.path}\` (${file.status}, +${file.additions}/-${file.deletions})`
    ),
    "",
    "### Applied Schema",
    "",
    summarizeSchema(input.schema)
  ].join("\n");
}

export function extractEndpointReferences(files: ChangedFile[]): EndpointReference[] {
  const endpoints: EndpointReference[] = [];
  const seen = new Set<string>();
  const routePattern = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi;

  for (const file of files) {
    const patch = file.patch ?? "";
    let match: RegExpExecArray | null;

    while ((match = routePattern.exec(patch)) !== null) {
      const endpoint = {
        method: match[1].toUpperCase(),
        route: match[2]
      };
      const key = `${endpoint.method} ${endpoint.route}`;

      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push(endpoint);
      }
    }
  }

  return endpoints;
}

function renderEndpointReference(endpoints: EndpointReference[]): string {
  return endpoints
    .map((endpoint) =>
      [
        `### \`${endpoint.method} ${endpoint.route}\``,
        "",
        "- Purpose: Exposes feature behavior through the server API.",
        "- Inputs: Review route parameters, query parameters, and JSON body handling in the implementation.",
        "- Returns: Review the response shape in the route handler and related tests.",
        "- Notes: Keep this reference updated when the route contract changes."
      ].join("\n")
    )
    .join("\n\n");
}

export function endpointTitle(endpoint: EndpointReference): string {
  if (endpoint.method === "GET" && endpoint.route === "/") {
    return "Landing page route";
  }

  const routeName = endpoint.route
    .replace(/^\/+/, "")
    .replace(/[:{}]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  if (!routeName) {
    return `${endpoint.method} route`;
  }

  return `${toTitleCase(routeName)} route`;
}

export function endpointSummary(endpoint: EndpointReference, repo: string): string {
  if (endpoint.method === "GET" && endpoint.route === "/") {
    return `The landing page route introduces ${repo} with a concise HTML product page.`;
  }

  if (endpoint.method === "GET" && endpoint.route === "/health-check") {
    return `The health-check route reports whether ${repo} is running and returns service metadata for local verification.`;
  }

  return `The \`${endpoint.method} ${endpoint.route}\` route exposes feature behavior in ${repo}.`;
}

function renderFileReference(files: ChangedFile[]): string {
  return [
    "No public endpoint or method signature was visible in the commit diff.",
    "",
    "### Implementation Files",
    "",
    ...files.map((file) => `- \`${file.path}\`: ${describeFileRole(file.path)}`)
  ].join("\n");
}

function describeFileRole(path: string): string {
  if (path.endsWith(".test.ts") || path.endsWith(".test.js")) {
    return "validates expected feature behavior.";
  }

  if (path.endsWith(".ts") || path.endsWith(".js")) {
    return "contains executable feature behavior.";
  }

  if (path.endsWith("package.json")) {
    return "declares scripts, package metadata, or runtime dependencies.";
  }

  return "participates in the documented feature change.";
}

function summarizeSchema(schema: string): string {
  const firstHeading = schema
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();

  return `- Local schema: ${firstHeading || "docs/.schema/feature-page.md"}`;
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}
