import { classifyImpact } from "../analysis/impact-classifier.js";
import { filterNoise } from "../analysis/noise-filter.js";
import type {
  CommitEvent,
  PipelineDependencies,
  PipelineResult,
  RunRecord
} from "./types.js";

export async function runPipeline(
  event: CommitEvent,
  dependencies: PipelineDependencies
): Promise<PipelineResult> {
  const dedupeKey = `${event.repo}:${event.afterSha}:${dependencies.publisher.destination}`;
  const existing = await dependencies.runStore.findByDedupeKey(dedupeKey);

  if (existing) {
    return {
      reused: true,
      record: existing
    };
  }

  const files = await dependencies.diffFetcher.fetch(event);
  const relevantFiles = filterNoise(files);
  const decision = classifyImpact(relevantFiles);

  if (!decision.shouldPublish || decision.docType === "ignore") {
    const record: RunRecord = {
      id: crypto.randomUUID(),
      dedupeKey,
      status: "skipped",
      event,
      decision,
      changedFiles: files.map((file) => file.path),
      createdAt: new Date().toISOString()
    };

    await dependencies.runStore.save(record);

    return {
      reused: false,
      record
    };
  }

  const docs = await dependencies.generator.generate({
    event,
    files: relevantFiles,
    decision
  });
  const publishResults = [];

  for (const doc of docs) {
    publishResults.push(await dependencies.publisher.publish(doc));
  }

  const record: RunRecord = {
    id: crypto.randomUUID(),
    dedupeKey,
    status: "published",
    event,
    decision,
    changedFiles: relevantFiles.map((file) => file.path),
    publishResult: publishResults[0],
    publishResults,
    createdAt: new Date().toISOString()
  };

  await dependencies.runStore.save(record);

  return {
    reused: false,
    record
  };
}
