# Commit Doc Agent Feature Page Schema

This file controls the shape of generated documentation for this project.
Edit it to teach the agent how your docs should read.

## Page Goal

Each generated page should document one feature or capability, not just summarize a commit.
Write for a teammate who wants to understand what the feature does and how to start using it.

## Required Page Shape

Use this structure for every generated feature page:

1. # Feature Name
2. ## Purpose
3. ## Getting Started
4. ## Reference
5. ## Source Notes

## Section Rules

### Purpose

Explain what the feature does, who it helps, and why it exists.
Keep this concise and avoid inventing product context that is not visible in the commit.

### Getting Started

Give practical first steps for using, running, or validating the feature.
Link to the reference section with [Reference](#reference).

### Reference

Document public methods, endpoints, commands, components, configuration, or exported types exposed by the feature.
For each exposed item, include the name or route, accepted inputs, returned output, and important behavior.
If no public methods are visible, explain which files define the behavior and what a maintainer should inspect.

### Source Notes

List the changed files and source commit so the reader can trace the documentation back to code.

## Style Rules

Use clear Markdown headings and short paragraphs.
Prefer concrete details from code, file names, diffs, tests, and commit metadata.
Do not include hidden reasoning, speculation, or deployment steps that are not supported by the source change.
