import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DocPublisher, GeneratedDoc, PublishResult } from "../core/types.js";

export class ReportPublisher implements DocPublisher {
  readonly destination = "docs";

  constructor(private readonly outputDir = "docs") {}

  async publish(doc: GeneratedDoc): Promise<PublishResult> {
    const docFileName = `${safeFileStem(doc.title, doc.source.afterSha)}.md`;
    const referenceFileName = `${safeName(doc.source.afterSha.slice(0, 12))}-${safeFileStem(doc.title, doc.source.afterSha)}.md`;
    const docPath = resolve(this.outputDir, docFileName);
    const referenceDir = resolve(this.outputDir, ".reports");
    const referencePath = resolve(referenceDir, referenceFileName);
    const indexPath = resolve(referenceDir, "latest.md");
    const docContent = renderDeveloperDoc(doc);
    const referenceContent = renderMetadataReport(doc, docPath);

    await mkdir(this.outputDir, { recursive: true });
    await mkdir(referenceDir, { recursive: true });
    await writeFile(docPath, docContent, "utf8");
    await writeFile(referencePath, referenceContent, "utf8");
    await writeFile(indexPath, referenceContent, "utf8");

    return {
      destination: this.destination,
      externalId: docPath,
      url: docPath,
      referenceUrl: referencePath
    };
  }
}

function renderDeveloperDoc(doc: GeneratedDoc): string {
  return `${doc.contentMarkdown}\n`;
}

function renderMetadataReport(doc: GeneratedDoc, docPath: string): string {
  return [
    "---",
    `title: ${JSON.stringify(doc.title)}`,
    `docType: ${doc.docType}`,
    `repo: ${doc.source.repo}`,
    `branch: ${doc.source.branch}`,
    `commit: ${doc.source.afterSha}`,
    `source: ${JSON.stringify(doc.source.commitUrl)}`,
    `canonicalDoc: ${JSON.stringify(docPath)}`,
    "---",
    "",
    doc.contentMarkdown,
    ""
  ].join("\n");
}

function safeFileStem(title: string, fallbackSha: string): string {
  const titleStem = safeName(title);

  if (titleStem) {
    return titleStem;
  }

  return `change-${safeName(fallbackSha.slice(0, 12))}`;
}

function safeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
