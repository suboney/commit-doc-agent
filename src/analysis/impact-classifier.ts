import type { ChangedFile, DocDecision, DocType } from "../core/types.js";

type Rule = {
  docType: DocType;
  confidence: number;
  reason: string;
  matches(path: string): boolean;
};

const rules: Rule[] = [
  {
    docType: "api_note",
    confidence: 0.86,
    reason: "API-facing files changed.",
    matches: (path) =>
      path.includes("/api/") ||
      path.includes("/routes/") ||
      path.includes("openapi") ||
      path.includes("schema")
  },
  {
    docType: "runbook_update",
    confidence: 0.82,
    reason: "Infrastructure or operational files changed.",
    matches: (path) =>
      path.includes("infra/") ||
      path.includes("deploy") ||
      path.includes("docker") ||
      path.includes("scripts/") ||
      path.includes("hooks/")
  },
  {
    docType: "adr",
    confidence: 0.76,
    reason: "Architecture-sensitive source paths changed.",
    matches: (path) =>
      path.includes("auth") ||
      path.includes("architecture") ||
      path.includes("core/") ||
      path.includes("database") ||
      path.includes("migrations")
  }
];

export function classifyImpact(files: ChangedFile[]): DocDecision {
  if (files.length === 0) {
    return {
      shouldPublish: false,
      docType: "ignore",
      confidence: 0.98,
      reason: "Only ignored or noisy files changed."
    };
  }

  const normalizedPaths = files.map((file) => file.path.toLowerCase());

  for (const rule of rules) {
    if (normalizedPaths.some((path) => rule.matches(path))) {
      return {
        shouldPublish: true,
        docType: rule.docType,
        confidence: rule.confidence,
        reason: rule.reason
      };
    }
  }

  return {
    shouldPublish: true,
    docType: "change_brief",
    confidence: 0.68,
    reason: "Meaningful source files changed, but no specialized doc route matched."
  };
}
