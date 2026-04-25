import type { ChangedFile, CommitEvent, DiffFetcher } from "../core/types.js";
import { fixtureChangedFiles } from "./changed-files.js";

export class FixtureDiffFetcher implements DiffFetcher {
  async fetch(_event: CommitEvent): Promise<ChangedFile[]> {
    return fixtureChangedFiles;
  }
}
