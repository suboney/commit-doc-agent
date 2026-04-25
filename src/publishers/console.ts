import type { DocPublisher, GeneratedDoc, PublishResult } from "../core/types.js";

export class ConsolePublisher implements DocPublisher {
  readonly destination = "console";

  async publish(doc: GeneratedDoc): Promise<PublishResult> {
    console.log("\n--- Generated Documentation ---\n");
    console.log(doc.contentMarkdown);
    console.log("\n--- End Generated Documentation ---\n");

    return {
      destination: this.destination,
      externalId: `console:${doc.source.afterSha}`,
      url: doc.source.commitUrl
    };
  }
}
