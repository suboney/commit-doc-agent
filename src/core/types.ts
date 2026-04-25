export type Provider = "fixture" | "local_git";

export type Destination = "console" | "docs";

export type DocType = "change_brief" | "api_note" | "runbook_update" | "adr";

export type CommitEvent = {
  provider: Provider;
  repo: string;
  branch: string;
  beforeSha: string;
  afterSha: string;
  commitUrl: string;
  authorName?: string;
  authorEmail?: string;
  message?: string;
  occurredAt: string;
};

export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
};

export type DiffSummary = {
  event: CommitEvent;
  files: ChangedFile[];
};

export type DocDecision = {
  shouldPublish: boolean;
  docType: DocType | "ignore";
  confidence: number;
  reason: string;
};

export type GeneratedDoc = {
  title: string;
  docType: DocType;
  summary: string;
  contentMarkdown: string;
  source: {
    repo: string;
    branch: string;
    afterSha: string;
    commitUrl: string;
  };
};

export type PublishResult = {
  destination: Destination;
  externalId: string;
  url: string;
  referenceUrl?: string;
};

export type RunStatus = "published" | "skipped" | "failed";

export type RunRecord = {
  id: string;
  dedupeKey: string;
  status: RunStatus;
  event: CommitEvent;
  decision: DocDecision;
  changedFiles: string[];
  publishResult?: PublishResult;
  publishResults?: PublishResult[];
  error?: string;
  createdAt: string;
};

export type DiffFetcher = {
  fetch(event: CommitEvent): Promise<ChangedFile[]>;
};

export type DocPublisher = {
  destination: Destination;
  publish(doc: GeneratedDoc): Promise<PublishResult>;
};

export type RunStore = {
  findByDedupeKey(dedupeKey: string): Promise<RunRecord | undefined>;
  save(record: RunRecord): Promise<void>;
};

export type DocGenerationInput = {
  event: CommitEvent;
  files: ChangedFile[];
  decision: DocDecision;
};

export type DocGenerator = {
  generate(input: DocGenerationInput): Promise<GeneratedDoc[]>;
};

export type PipelineDependencies = {
  diffFetcher: DiffFetcher;
  generator: DocGenerator;
  publisher: DocPublisher;
  runStore: RunStore;
};

export type PipelineResult = {
  reused: boolean;
  record: RunRecord;
};
