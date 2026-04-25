# Health Check route

## Purpose

The health-check route provides a simple endpoint to verify that the demo-project server is running and returns basic service metadata for local validation.

## Getting Started

To check if the demo-project server is running, send a GET request to `/health-check`.

[Reference](#reference)

## Reference

The health-check route returns a JSON response with the following structure:

```json
{
  "ok": boolean,
  "service": string,
  "timestamp": string
}
```

- `ok`: Indicates whether the server is running (`true` if healthy).
- `service`: The name of the service (`commit-doc-agent-demo`).
- `timestamp`: ISO 8601 formatted timestamp of the response.

## Source Notes

- Changed file: `src/index.ts`
- Commit: `local:/Users/zakpak0/Suboney/blackathon-2026/demo-project@working-tree-routes`
- Commit message: `feat: render architecture page`
