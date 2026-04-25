import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RunRecord, RunStore } from "../core/types.js";

type StoreShape = {
  runs: RunRecord[];
};

export class LocalJsonRunStore implements RunStore {
  constructor(private readonly filePath = ".run-store/runs.json") {}

  async findByDedupeKey(dedupeKey: string): Promise<RunRecord | undefined> {
    const store = await this.readStore();

    return store.runs.find((run) => run.dedupeKey === dedupeKey);
  }

  async save(record: RunRecord): Promise<void> {
    const store = await this.readStore();
    const existingIndex = store.runs.findIndex((run) => run.id === record.id);

    if (existingIndex >= 0) {
      store.runs[existingIndex] = record;
    } else {
      store.runs.push(record);
    }

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }

  private async readStore(): Promise<StoreShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StoreShape;
    } catch (error) {
      if (isMissingFileError(error)) {
        return { runs: [] };
      }

      throw error;
    }
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
