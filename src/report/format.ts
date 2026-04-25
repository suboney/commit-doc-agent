import type { PublishResult } from "../core/types.js";

export function formatPublishSummary(result: PublishResult): string {
  if (result.referenceUrl) {
    return `Saved docs to ${result.url}. Hidden reference files are in ${result.referenceUrl}.`;
  }

  return `Saved docs to ${result.url}.`;
}
