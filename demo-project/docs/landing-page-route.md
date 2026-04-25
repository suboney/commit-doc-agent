# Landing page route

## Purpose

The landing page route provides a static HTML page that showcases the demo-project's product features and metrics. It exists to demonstrate the commit-doc-agent's functionality through a user-friendly interface.

## Getting Started

To view the landing page:

1. Start the demo server with `npm run start`
2. Open `http://localhost:3000` in your browser

[Reference](#reference)

## Reference

The `/` route returns a static HTML page with the following structure:

- **Input**: None (HTTP GET request)
- **Output**: HTML page with product summary and metrics
- **Behavior**: Renders the `product` object defined in `src/index.ts` into a styled template

The `product` object contains:
- `name`: Product name ("Commit Doc Agent")
- `tagline`: Product tagline ("Documentation that keeps up with every local commit.")
- `promise`: Product promise description
- `metrics`: Array of product metrics with `label` and `value` fields

## Source Notes

- Changed file: `src/index.ts`
- Commit: `local:/Users/zakpak0/Suboney/blackathon-2026/demo-project@working-tree-routes`
- Commit message: `feat: render architecture page`
