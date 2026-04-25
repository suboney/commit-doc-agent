import express, { type Express } from "express";
import { pathToFileURL } from "node:url";

const defaultPort = 3000;

type ProductMetric = {
  label: string;
  value: string;
};

type ProductSummary = {
  name: string;
  tagline: string;
  promise: string;
  metrics: ProductMetric[];
};

type ArchitectureComponent = {
  name: string;
  purpose: string;
};

type ArchitectureSummary = {
  product: string;
  overview: string;
  flow: string[];
  components: ArchitectureComponent[];
  artifacts: string[];
};

const product: ProductSummary = {
  name: "Commit Doc Agent",
  tagline: "Documentation that keeps up with every local commit.",
  promise:
    "A local-first developer tool that watches git commits, explains meaningful code changes, and keeps project docs current without leaving your machine.",
  metrics: [
    {
      label: "Trigger",
      value: "post-commit"
    },
    {
      label: "Output",
      value: "Markdown docs"
    },
    {
      label: "Model",
      value: "Local Ollama"
    }
  ]
};

const architecture: ArchitectureSummary = {
  product: product.name,
  overview:
    "Commit Doc Agent runs inside a local repository, watches completed git commits, analyzes the changed files, and writes durable Markdown documentation back into the project.",
  flow: [
    "A developer creates a local git commit.",
    "The post-commit hook invokes the CLI from the repository root.",
    "The CLI reads commit metadata and file diffs from local git.",
    "The generator writes feature documentation using the project schema and local Ollama when available.",
    "The publisher saves human-facing docs and hidden reference metadata under docs/."
  ],
  components: [
    {
      name: "Post-commit hook",
      purpose: "Triggers documentation generation immediately after each local commit."
    },
    {
      name: "Local git adapter",
      purpose: "Collects commit metadata, changed files, stats, and patches without hosted infrastructure."
    },
    {
      name: "Documentation schema",
      purpose: "Lets each project edit the feature-page shape in docs/.schema/feature-page.md."
    },
    {
      name: "Generator",
      purpose: "Produces feature pages from code changes, using Ollama with a template fallback."
    },
    {
      name: "Publisher",
      purpose: "Writes visible Markdown docs and hidden run reference files into the target repository."
    }
  ],
  artifacts: [
    "docs/*.md for human-facing feature documentation",
    "docs/.schema/feature-page.md for the editable documentation contract",
    "docs/.reports/*.md for hidden source metadata",
    ".run-store/*.json for local run history and dedupe state"
  ]
};

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.type("html").send(renderLandingPage(product));
  });

  app.get("/health-check", (_request, response) => {
    response.json({
      ok: true,
      service: "commit-doc-agent-demo",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/architecture", (_request, response) => {
    response.type("html").send(renderArchitecturePage(architecture));
  });

  return app;
}

export function startServer(port = readPort()): void {
  const app = createApp();

  app.listen(port, () => {
    console.log(`Commit Doc Agent demo listening on http://localhost:${port}`);
  });
}

function readPort(): number {
  const configuredPort = Number(process.env.PORT ?? defaultPort);

  return Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : defaultPort;
}

function renderLandingPage(summary: ProductSummary): string {
  const metrics = summary.metrics
    .map(
      (metric) => `
        <li>
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
        </li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(summary.name)}</title>
    <style>
      :root {
        color: #181510;
        background: #f7f1e6;
        font-family: Georgia, "Times New Roman", serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(135deg, rgba(247, 241, 230, 0.92), rgba(233, 228, 216, 0.7)),
          repeating-linear-gradient(90deg, rgba(24, 21, 16, 0.05) 0 1px, transparent 1px 96px);
      }

      main {
        display: grid;
        min-height: 100vh;
        align-items: center;
        padding: 48px clamp(20px, 6vw, 88px);
      }

      .shell {
        width: min(1040px, 100%);
      }

      .kicker {
        margin: 0 0 22px;
        color: #6d5e48;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      h1 {
        max-width: 820px;
        margin: 0;
        color: #17130d;
        font-size: clamp(3.3rem, 11vw, 8.8rem);
        font-weight: 700;
        letter-spacing: 0;
        line-height: 0.9;
      }

      .tagline {
        max-width: 720px;
        margin: 28px 0 0;
        color: #2e2a22;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: clamp(1.2rem, 2.5vw, 1.75rem);
        line-height: 1.45;
      }

      .promise {
        max-width: 700px;
        margin: 18px 0 0;
        color: #5a4e3e;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 1rem;
        line-height: 1.7;
      }

      ul {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        width: min(760px, 100%);
        margin: 44px 0 0;
        padding: 0;
        border: 1px solid rgba(24, 21, 16, 0.18);
        list-style: none;
      }

      li {
        display: grid;
        gap: 10px;
        min-height: 112px;
        align-content: center;
        padding: 22px;
        background: rgba(255, 252, 245, 0.72);
      }

      li span {
        color: #86745b;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      li strong {
        color: #19140e;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: clamp(1.05rem, 2vw, 1.35rem);
        line-height: 1.15;
      }

      @media (max-width: 700px) {
        main {
          align-items: start;
          padding-block: 36px;
        }

        ul {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell" aria-labelledby="product-title">
        <p class="kicker">Local-first documentation</p>
        <h1 id="product-title">${escapeHtml(summary.name)}</h1>
        <p class="tagline">${escapeHtml(summary.tagline)}</p>
        <p class="promise">${escapeHtml(summary.promise)}</p>
        <ul aria-label="Product highlights">
          ${metrics}
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

function renderArchitecturePage(summary: ArchitectureSummary): string {
  const flow = summary.flow
    .map((step, index) => `
        <li>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <p>${escapeHtml(step)}</p>
        </li>`)
    .join("");
  const components = summary.components
    .map((component) => `
        <li>
          <span>${escapeHtml(component.name)}</span>
          <strong>${escapeHtml(component.purpose)}</strong>
        </li>`)
    .join("");
  const artifacts = summary.artifacts
    .map((artifact) => `<li>${escapeHtml(artifact)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(summary.product)} Architecture</title>
    <style>
      :root {
        color: #181510;
        background: #f7f1e6;
        font-family: Georgia, "Times New Roman", serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(135deg, rgba(247, 241, 230, 0.94), rgba(233, 228, 216, 0.74)),
          repeating-linear-gradient(90deg, rgba(24, 21, 16, 0.05) 0 1px, transparent 1px 96px);
      }

      main {
        display: grid;
        gap: 56px;
        width: min(1120px, 100%);
        margin: 0 auto;
        padding: 48px clamp(20px, 6vw, 88px) 72px;
      }

      .hero {
        padding-top: clamp(16px, 8vh, 88px);
      }

      .kicker {
        margin: 0 0 22px;
        color: #6d5e48;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      h1 {
        max-width: 880px;
        margin: 0;
        color: #17130d;
        font-size: clamp(3.1rem, 9vw, 7.6rem);
        font-weight: 700;
        letter-spacing: 0;
        line-height: 0.9;
      }

      .overview {
        max-width: 760px;
        margin: 28px 0 0;
        color: #2e2a22;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: clamp(1.15rem, 2.2vw, 1.55rem);
        line-height: 1.5;
      }

      section {
        display: grid;
        gap: 20px;
      }

      h2 {
        margin: 0;
        color: #17130d;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: clamp(1.25rem, 2vw, 1.7rem);
        letter-spacing: 0;
      }

      .flow {
        display: grid;
        gap: 1px;
        margin: 0;
        padding: 0;
        border: 1px solid rgba(24, 21, 16, 0.18);
        list-style: none;
      }

      .flow li {
        display: grid;
        grid-template-columns: 70px 1fr;
        gap: 20px;
        align-items: start;
        min-height: 92px;
        padding: 22px;
        background: rgba(255, 252, 245, 0.72);
      }

      .flow span {
        color: #86745b;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      .flow p {
        margin: 0;
        color: #2e2a22;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 1.05rem;
        line-height: 1.55;
      }

      .components {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        margin: 0;
        padding: 0;
        border: 1px solid rgba(24, 21, 16, 0.18);
        list-style: none;
      }

      .components li {
        display: grid;
        gap: 10px;
        min-height: 132px;
        align-content: start;
        padding: 22px;
        background: rgba(255, 252, 245, 0.72);
      }

      .components span {
        color: #86745b;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .components strong {
        color: #19140e;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.35;
      }

      .artifacts {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .artifacts li {
        border: 1px solid rgba(24, 21, 16, 0.18);
        padding: 10px 12px;
        background: rgba(255, 252, 245, 0.72);
        color: #2e2a22;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        font-size: 0.92rem;
      }

      @media (max-width: 760px) {
        main {
          gap: 44px;
          padding-block: 36px 56px;
        }

        .flow li {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .components {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero" aria-labelledby="architecture-title">
        <p class="kicker">System architecture</p>
        <h1 id="architecture-title">${escapeHtml(summary.product)} Architecture</h1>
        <p class="overview">${escapeHtml(summary.overview)}</p>
      </section>
      <section aria-labelledby="flow-title">
        <h2 id="flow-title">Commit To Documentation Flow</h2>
        <ol class="flow">
          ${flow}
        </ol>
      </section>
      <section aria-labelledby="components-title">
        <h2 id="components-title">Core Components</h2>
        <ul class="components">
          ${components}
        </ul>
      </section>
      <section aria-labelledby="artifacts-title">
        <h2 id="artifacts-title">Generated Artifacts</h2>
        <ul class="artifacts">
          ${artifacts}
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character] ?? character;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startServer();
}
