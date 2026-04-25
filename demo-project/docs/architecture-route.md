# Architecture route

## Purpose

The `GET /architecture` route provides a designed HTML page that explains the demo-project architecture to consumers. It presents the local commit-to-documentation flow, the major system components, and the files the agent creates in a format that matches the visual language of the landing page.

## Getting Started

To view the architecture page:

1. Start the demo server with `npm run start`
2. Open `http://localhost:3000/architecture` in a browser

[Reference](#reference)

## Reference

### `GET /architecture`

- Inputs: No route parameters, query parameters, or request body are required.
- Returns: `text/html; charset=utf-8`.
- Behavior: Renders a full architecture page using the same paper-toned background, serif headline treatment, restrained sans-serif metadata, and bordered list pattern used by the root landing page.
- Content source: The route uses the `architecture` object in `src/index.ts` to render the overview, flow, components, and artifact list.

### Page Sections

- System architecture hero: Names the product and summarizes how the agent runs inside a local repository.
- Commit To Documentation Flow: Lists each step from local commit to generated docs.
- Core Components: Explains the post-commit hook, local git adapter, documentation schema, generator, and publisher.
- Generated Artifacts: Lists the visible docs, editable schema, hidden reports, and run-store files created by the workflow.

## Source Notes

- Changed file: `src/index.ts`
- Commit: `local:/Users/zakpak0/Suboney/blackathon-2026/demo-project@working-tree-routes`
- Commit message: `feat: render architecture page`
