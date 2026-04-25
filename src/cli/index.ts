#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { runPipeline } from "../core/pipeline.js";
import {
  defaultStorePathForAdapter
} from "../generation/adapter-defaults.js";
import {
  createDocClassifier,
  createDocGenerator,
  isGeneratorAdapter,
  type GeneratorAdapter
} from "../generation/create-generator.js";
import { FixtureDiffFetcher } from "../fixtures/fixture-diff-fetcher.js";
import { createFixtureCommitEvent } from "../fixtures/fixture-event.js";
import {
  createLocalGitCommitEvent,
  installPostCommitHook,
  LocalGitDiffFetcher
} from "../git/local-git.js";
import { ConsolePublisher } from "../publishers/console.js";
import { ReportPublisher } from "../publishers/report.js";
import { formatPublishSummary } from "../report/format.js";
import { setupLocalProject } from "../setup/local-setup.js";
import { LocalJsonRunStore } from "../storage/local-store.js";

const program = new Command();

program
  .name("commit-doc-agent")
  .description("Generate documentation from Git commit changes.")
  .version("0.1.0");

program
  .command("fixture")
  .description("Run the fixture-based development pipeline.")
  .option("--store <path>", "Path to the local JSON run store.", ".run-store/runs.json")
  .action(async (options: { store: string }) => {
    const result = await runPipeline(createFixtureCommitEvent(), {
      diffFetcher: new FixtureDiffFetcher(),
      generator: createDocGenerator(),
      publisher: new ReportPublisher("docs"),
      runStore: new LocalJsonRunStore(options.store)
    });

    printRunResult(result.record.status, result.reused, result.record.id);

    for (const publishResult of publishResultsForSummary(result.record)) {
      console.log(formatPublishSummary(publishResult));
    }
  });

const setupCommand = program
  .command("setup")
  .description("Simple setup helpers for local documentation.");

setupCommand
  .command("local")
  .description("Prepare a local git repo so docs are generated automatically after each commit.")
  .option("--repo <path>", "Path to the local git repository.", ".")
  .option("--adapter <name>", "Documentation adapter to configure.", "auto")
  .option("--ollama", "Use the Ollama adapter.")
  .action(async (options: { repo: string; adapter: string; ollama?: boolean }) => {
    const adapter = resolveAdapterOption(options.adapter, options.ollama);
    const result = await setupLocalProject(options.repo, resolve(process.argv[1]), { adapter });

    console.log(formatSetupSummary(result));
  });

program
  .command("local")
  .description("Generate documentation for a commit in a local git repository.")
  .option("--repo <path>", "Path to the local git repository.", ".")
  .option("--ref <ref>", "Commit ref to document.", "HEAD")
  .option(
    "--out <dir>",
    "Directory where generated markdown docs are written. Hidden report metadata is stored in .reports under this directory.",
    "docs"
  )
  .option("--store <path>", "Path to the local JSON run store.")
  .option("--adapter <name>", "Documentation adapter to use.", "auto")
  .option("--ollama", "Use the Ollama adapter.")
  .option("--console", "Print the generated documentation instead of writing project docs.")
  .action(
    async (options: {
      repo: string;
      ref: string;
      out: string;
      store?: string;
      adapter: string;
      ollama?: boolean;
      console?: boolean;
    }, command: Command) => {
      const event = await createLocalGitCommitEvent(options.repo, options.ref);
      const adapter = resolveAdapterOption(options.adapter, options.ollama);
      const outPath = resolveDefaultProjectPath(
        options.repo,
        options.out,
        command.getOptionValueSource("out") === "default"
      );
      const storePath = resolveDefaultProjectPath(
        options.repo,
        options.store ?? defaultStorePathForAdapter(adapter),
        !options.store
      );
      const publisher = options.console ? new ConsolePublisher() : new ReportPublisher(outPath);
      const result = await runPipeline(event, {
        diffFetcher: new LocalGitDiffFetcher(options.repo),
        classifier: createDocClassifier(options.repo, adapter),
        generator: createDocGenerator(options.repo, adapter),
        publisher,
        runStore: new LocalJsonRunStore(storePath)
      });

      printRunResult(result.record.status, result.reused, result.record.id);

      for (const publishResult of publishResultsForSummary(result.record)) {
        console.log(formatPublishSummary(publishResult));
      }
    }
  );

program
  .command("install-hook")
  .description("Advanced: install only the post-commit hook. Most users should run `setup local`.")
  .option("--repo <path>", "Path to the local git repository.", ".")
  .option("--out <dir>", "Directory where generated markdown docs are written.", "docs")
  .option("--store <path>", "Path to the local JSON run store.")
  .option("--adapter <name>", "Documentation adapter to configure.", "auto")
  .option("--ollama", "Use the Ollama adapter.")
  .option("--command <command>", "Command used by the hook.", `node "${resolve(process.argv[1])}"`)
  .action(
    async (options: {
      repo: string;
      out: string;
      store?: string;
      adapter: string;
      ollama?: boolean;
      command: string;
    }) => {
      const adapter = resolveAdapterOption(options.adapter, options.ollama);
      const storePath = options.store ?? defaultStorePathForAdapter(adapter);
      const hookPath = await installPostCommitHook(options.repo, {
        command: options.command,
        fallbackScriptPath: resolve(process.argv[1]),
        ref: "HEAD",
        outDir: options.out,
        storePath,
        adapter: adapter === "auto" ? undefined : adapter
      });

      console.log("Automatic docs on commit are ready.");
      console.log(`Hook installed at: ${hookPath}`);
    }
  );

await program.parseAsync();

function printRunResult(status: string, reused: boolean, _id: string): void {
  if (status === "published" && reused) {
    console.log("Docs were already up to date for this commit.");
    return;
  }

  if (status === "published") {
    console.log("Docs were created for this commit.");
    return;
  }

  if (status === "skipped") {
    console.log("This commit did not need new docs.");
    return;
  }

  console.log(`Docs finished with status: ${status}`);
}

function formatSetupSummary(result: {
  repoRoot: string;
  gitRoot: string;
  docsDir: string;
  storePath: string;
  hookPath: string;
  addedIgnoreEntries: string[];
}): string {
  const lines = [
    "Local docs setup is ready.",
    `Project folder: ${result.repoRoot}`,
    `Git root: ${result.gitRoot}`,
    `Docs folder: ${result.docsDir}`,
    `Automatic hook: ${result.hookPath}`,
    `Local run history: ${result.storePath}`
  ];

  if (result.addedIgnoreEntries.length > 0) {
    lines.push(`Updated .gitignore: ${result.addedIgnoreEntries.join(", ")}`);
  } else {
    lines.push("Git ignore rules were already set.");
  }

  lines.push("Next: make a small code change and create a git commit.");

  return lines.join("\n");
}

function publishResultsForSummary(result: {
  publishResult?: import("../core/types.js").PublishResult;
  publishResults?: import("../core/types.js").PublishResult[];
}): import("../core/types.js").PublishResult[] {
  if (result.publishResults) {
    return result.publishResults;
  }

  return result.publishResult ? [result.publishResult] : [];
}

function resolveAdapterOption(
  adapterOption: string,
  useOllama = false
): GeneratorAdapter {
  if (useOllama) {
    return "ollama";
  }

  if (!isGeneratorAdapter(adapterOption)) {
    throw new Error(
      `Unsupported adapter: ${adapterOption}. Supported values are auto, template, and ollama.`
    );
  }

  return adapterOption;
}

function resolveDefaultProjectPath(repoPath: string, path: string, useProjectRoot: boolean): string {
  if (!useProjectRoot) {
    return path;
  }

  return resolve(repoPath, path);
}
