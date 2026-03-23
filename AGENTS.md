# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Claude skill package for saving web pages to Squirrel bookmarks. Keep top-level files focused:

- `SKILL.md`: main skill behavior, workflow, and response format.
- `README.md`: user-facing setup and usage notes.
- `evals.json`: lightweight evaluation prompts and expected outcomes.
- `scripts/`: Bun-based helper code.
- `scripts/fetch-page.ts`: fetch pipeline with defuddle, Jina, and browser fallback.
- `scripts/package.json`: local script entrypoint and Bun dependency metadata.

## Build, Test, and Development Commands
Run commands from the repository root unless noted otherwise.

- `cd scripts && bun install`: install the Bun dev dependency.
- `cd scripts && bun run fetch https://example.com`: execute the fetch helper through the package script.
- `bun run scripts/fetch-page.ts https://example.com`: run the TypeScript entrypoint directly from the root.
- `python -m scripts.package_skill /path/to/squirrel-bookmark`: package the skill for distribution, as documented in `README.md`.

There is no dedicated build step at the moment; changes are made directly to Markdown, JSON, and Bun TypeScript files.

## Coding Style & Naming Conventions
Use 2-space indentation in JSON and Markdown examples, and follow the existing TypeScript style in [`scripts/fetch-page.ts`](/Users/bytedance/workspace/squirrel-bookmark-skill/scripts/fetch-page.ts): semicolons, single quotes, `camelCase` for functions, and `UPPER_SNAKE_CASE` for constants like `REQUEST_TIMEOUT`. Keep comments short and only where the fallback logic or safety checks are not obvious. Preserve the repository’s current bilingual documentation style when editing Chinese-facing docs.

## Testing Guidelines
Automated unit tests are not configured yet. Treat `evals.json` as the current regression checklist and add a new eval when behavior changes. For code changes, run the fetch script manually against a safe public URL and verify:

- successful JSON output
- correct `source` and `contentType`
- SSRF and invalid-URL failures still exit non-zero

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Remove SQUIRREL_BASE_URL config, use fixed API endpoint`. Follow that pattern: concise summary, present tense, no trailing period. PRs should include the user-visible behavior change, any config or API impact, and a short test note. Include example output when you modify fetch behavior or response formatting.

## Security & Configuration Tips
Never commit real `SQUIRREL_API_TOKEN` or `JINA_API_KEY` values. Keep the fixed Squirrel API endpoint unchanged unless the skill contract is intentionally being revised. Preserve the existing URL validation and private-network blocking logic when editing the fetch script.
