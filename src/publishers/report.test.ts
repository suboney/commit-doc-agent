import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { ReportPublisher } from "./report.js";

test("ReportPublisher writes developer docs and hidden report metadata", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "commit-doc-agent-"));
  const docsDir = join(rootDir, "docs");
  const publisher = new ReportPublisher(docsDir);

  try {
    const result = await publisher.publish({
      title: "Add project activity endpoint",
      docType: "api_note",
      summary: "1 relevant file changed in demo-project.",
      contentMarkdown: "# Add project activity endpoint\n\n## Summary\n\nDeveloper-facing notes.\n",
      source: {
        repo: "demo-project",
        branch: "main",
        afterSha: "d024a2aba3db0000000000000000000000000000",
        commitUrl: "local:/tmp/demo-project@d024a2aba3db0000000000000000000000000000"
      }
    });

    const docPath = resolve(docsDir, "add-project-activity-endpoint.md");
    const referencePath = resolve(
      docsDir,
      ".reports",
      "d024a2aba3db-add-project-activity-endpoint.md"
    );
    const latestPath = resolve(docsDir, ".reports", "latest.md");

    assert.equal(result.destination, "docs");
    assert.equal(result.url, docPath);
    assert.equal(result.referenceUrl, referencePath);

    const docContent = await readFile(docPath, "utf8");
    const referenceContent = await readFile(referencePath, "utf8");
    const latestContent = await readFile(latestPath, "utf8");

    assert.match(docContent, /# Add project activity endpoint/);
    assert.match(referenceContent, /canonicalDoc:/);
    assert.match(referenceContent, /docType: api_note/);
    assert.equal(latestContent, referenceContent);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
