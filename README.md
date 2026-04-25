# Commit-Driven Documentation Agent

`commit-doc-agent` is a local-first CLI that turns git commits into editable feature documentation.

It installs into a repository, listens through a local post-commit hook, analyzes the latest diff, and writes feature-page markdown into `docs/`.

## Install

After publish:

```sh
npm install -g @suboney/commit-doc-agent
```

## Usage

Prepare a repo for automatic docs:

```sh
commit-doc-agent setup local --repo .
```

Generate docs for the latest commit manually:

```sh
commit-doc-agent local --repo . --ref HEAD --out docs
```

Use local Ollama generation:

```sh
commit-doc-agent setup local --repo . --ollama
```

The generated docs use an editable schema at `docs/.schema/feature-page.md`.

## Development

```sh
npm install
npm test
npm run cli -- --help
npm run cli -- setup local --repo demo-project
npm run cli -- local --repo demo-project --ref HEAD --out demo-project/docs
```

See [Project Overview](docs/PROJECT_OVERVIEW.md) for the architecture and source map.

## Publishing

Release target:

- Package name: `@suboney/commit-doc-agent`
- npm account: `suboney`
- Public install command after publish: `npm install -g @suboney/commit-doc-agent`

Build and inspect the package before publishing:

```sh
npm test
npm pack --dry-run
```

Publish from an authenticated npm session:

```sh
npm login
npm whoami
npm publish
```
