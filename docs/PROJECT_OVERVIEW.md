# Project Overview

`commit-doc-agent` is a local-first CLI that turns git commits into editable feature documentation.

## Product Flow

```text
git commit -> post-commit hook -> commit-doc-agent -> git diff -> doc generator -> docs/
```

The CLI reads a local commit, filters noisy files, classifies whether the change is documentation-worthy, generates feature-page markdown, and writes the result into the target repo's `docs/` folder. Hidden run metadata is written to `docs/.reports/`, and dedupe state is stored in `.run-store/`.

## Main Commands

```sh
commit-doc-agent setup local --repo .
commit-doc-agent local --repo . --ref HEAD --out docs
commit-doc-agent install-hook --repo .
```

For local development from this repository:

```sh
npm run cli -- setup local --repo demo-project
npm run cli -- local --repo demo-project --ref HEAD --out demo-project/docs
```

## Important Source Areas

- `src/cli/index.ts`: Commander CLI entrypoint and command wiring.
- `src/core/pipeline.ts`: Orchestrates event intake, filtering, classification, generation, publishing, and run storage.
- `src/git/local-git.ts`: Reads commit metadata and changed files from a local git repository.
- `src/analysis/`: Filters noise and classifies documentation impact.
- `src/generation/`: Chooses template or Ollama-backed document generation.
- `src/templates/feature-page.ts`: Deterministic fallback renderer and route detection.
- `src/schema/doc-schema.ts`: Copies and loads the editable project schema at `docs/.schema/feature-page.md`.
- `src/llm/ollama-adapter.ts`: Optional local Ollama integration using the native chat API.
- `src/publishers/report.ts`: Writes generated docs and hidden reports.
- `demo-project/`: Local TypeScript Express demo app. Do not remove it.

## Documentation Model

Generated docs are feature pages with:

- Purpose
- Getting Started
- Reference
- Source Notes

Each target project gets an editable schema at `docs/.schema/feature-page.md`. The generator reads that local schema on every run so users can steer future documentation without changing the CLI package.

## Release Notes

The npm package name is `@suboney/commit-doc-agent`, published from the `suboney` npm organization.

Before publishing:

```sh
npm test
npm pack --dry-run
npm publish
```
