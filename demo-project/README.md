# Demo API Project

This is a small Node API used as the target project for the documentation agent demo.

If you are just experimenting, the simplest path is:

1. run `npm install`
2. run `npm --prefix .. run commit-doc-agent:setup --local`
3. make a small code change
4. commit it
5. open `docs/`

The tool writes the readable docs into `docs/`. It keeps its own hidden reference files in `docs/.reports/`.

## Run Locally

```sh
npm install
npm run dev
```

The server listens on:

```text
http://localhost:3000
```

Set `PORT` to override the default port.

## Endpoints

- `GET /health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `GET /api/projects/:id/activity`
- `POST /api/projects/:id/archive`

## Good Change Ideas

Try expanding the API in obvious ways:

- add authentication checks
- add a new endpoint under `/api/projects`
- change the project schema
- add validation rules
- add operational config

Those changes tend to produce clear diffs and useful generated docs.

## Documentation Commands

- `npm --prefix .. run commit-doc-agent:setup --local`
  - turns on automatic docs after every commit
  - creates the folders and ignore rules the tool needs
- `npm --prefix .. run commit-doc-agent:generate --local`
  - generates docs once for the latest commit without waiting for another commit
- `npm --prefix .. run commit-doc-agent:setup --local --ollama`
  - installs the automatic commit hook using the Ollama adapter
- `npm --prefix .. run commit-doc-agent:generate --local --ollama`
  - generates docs once with the Ollama adapter

## What Happens After A Commit

After `npm --prefix .. run commit-doc-agent:setup --local`, every local git commit runs the CLI automatically through a post-commit hook.

The CLI reads the latest commit, creates or updates docs in `docs/`, and stores hidden reference data in `docs/.reports/`.

## Optional AI Mode

If you want Ollama to write the docs instead of the built-in template:

```sh
npm --prefix .. run commit-doc-agent:setup --local --ollama
npm --prefix .. run commit-doc-agent:generate --local --ollama
```

The optional environment variables are listed in `.env.example`.
