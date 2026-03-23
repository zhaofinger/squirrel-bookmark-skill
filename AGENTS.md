# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vercel-style agent skills package for saving web pages to Squirrel bookmarks. Keep the repository split between package-level files and skill-specific files:

- `README.md`: package-level installation, usage, and publishing notes.
- `LICENSE`: package license for public distribution.
- `skills/squirrel-bookmark/SKILL.md`: main skill behavior, workflow, and response format.
- `skills/squirrel-bookmark/evals.json`: lightweight evaluation prompts and expected outcomes.
- `skills/squirrel-bookmark/agents/openai.yaml`: OpenAI-compatible skill metadata.
- `skills/squirrel-bookmark/scripts/`: Bun-based helper code.
- `skills/squirrel-bookmark/scripts/fetch-page.ts`: fetch pipeline with defuddle, Jina, and browser fallback.
- `skills/squirrel-bookmark/scripts/package.json`: local script entrypoint and Bun dependency metadata.

## Build, Test, and Development Commands
Run commands from the repository root unless noted otherwise.

- `cd skills/squirrel-bookmark/scripts && bun install`: install the Bun dev dependency.
- `cd skills/squirrel-bookmark/scripts && bun run fetch https://example.com`: execute the fetch helper through the package script.
- `bun run skills/squirrel-bookmark/scripts/fetch-page.ts https://example.com`: run the TypeScript entrypoint directly from the root.
- `npx skills add <owner/repo> --skill squirrel-bookmark`: install the packaged skill from a public repository.

There is no dedicated build step at the moment; changes are made directly to Markdown, JSON, and Bun TypeScript files.

## Coding Style & Naming Conventions
Use 2-space indentation in JSON and Markdown examples, and follow the existing TypeScript style in [`fetch-page.ts`](/Users/bytedance/workspace/squirrel-bookmark-skill/skills/squirrel-bookmark/scripts/fetch-page.ts): semicolons, single quotes, `camelCase` for functions, and `UPPER_SNAKE_CASE` for constants like `REQUEST_TIMEOUT`. Keep comments short and only where the fallback logic or safety checks are not obvious. Public-facing skill docs should stay in English.

## Testing Guidelines
Automated unit tests are not configured yet. Treat [`evals.json`](/Users/bytedance/workspace/squirrel-bookmark-skill/skills/squirrel-bookmark/evals.json) as the current regression checklist and add a new eval when behavior changes. For code changes, run the fetch script manually against a safe public URL and verify:

- successful JSON output
- correct `source` and `contentType`
- SSRF and invalid-URL failures still exit non-zero

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Remove SQUIRREL_BASE_URL config, use fixed API endpoint`. Follow that pattern: concise summary, present tense, no trailing period. PRs should include the user-visible behavior change, any config or API impact, and a short test note. Include example output when you modify fetch behavior or response formatting.

## Security & Configuration Tips
Never commit real `SQUIRREL_API_TOKEN` or `JINA_API_KEY` values. Keep the fixed Squirrel API endpoint unchanged unless the skill contract is intentionally being revised. Preserve the existing URL validation and private-network blocking logic when editing the fetch script.
