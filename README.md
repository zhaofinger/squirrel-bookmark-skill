# Squirrel Bookmark Skill Package

This repository is a Vercel-style agent skills package for saving public web pages to Squirrel bookmarks.

## Included Skill

- `squirrel-bookmark`: fetches a public web page, generates bookmark metadata with AI, supports user-defined summary preferences, and saves it to the fixed Squirrel bookmark API.

## Repository Layout

```text
skills/
  squirrel-bookmark/
    SKILL.md
    evals.json
    agents/
      openai.yaml
    scripts/
      fetch-page.ts
      package.json
```

## Install

Install the specific skill from this repository:

```bash
npx skills add zhaofinger/squirrel-bookmark-skill --skill squirrel-bookmark
```

If the repository is already known to contain a single skill, a plain repository install may also work:

```bash
npx skills add zhaofinger/squirrel-bookmark-skill
```

## Requirements

- `SQUIRREL_API_TOKEN` must be available at runtime.
- The runtime must have AI capability. The skill does not fall back to rule-based metadata extraction.
- Bun is required to run the local fetch helper.
- `JINA_API_KEY` is optional.

## Summary Customization

The skill keeps sensible defaults, but users can customize summary generation per request.

Supported summary options:

- `language`
- `format`
- `style`
- `length`

Example requests:

```text
Save this page to Squirrel and write the summary in Chinese.
```

```text
Bookmark this URL. Make the summary a short technical paragraph in English.
```

```text
Save this page and use a long neutral summary with about 120 words.
```

The response should also expose the applied summary preferences so users can verify what was used.

## Local Development

Install Bun dependencies:

```bash
cd skills/squirrel-bookmark/scripts
bun install
```

Run the fetch helper:

```bash
cd skills/squirrel-bookmark/scripts
bun run fetch https://example.com
```

Or run it from the repository root:

```bash
bun run skills/squirrel-bookmark/scripts/fetch-page.ts https://example.com
```

## Publishing And Discovery

There is no separate publish command for `skills.sh`. To make the skill discoverable:

1. Keep the skill in a public Git repository.
2. Ensure the skill folder name matches the `name` in `SKILL.md`.
3. Share the install command with users.
4. Once users install it with `npx skills add`, it can appear in `skills.sh` search via install telemetry.

## Safety

- The skill only accepts public `http` and `https` URLs.
- Localhost, link-local, and private network addresses are rejected.
- The Squirrel API endpoint is fixed and must not be overridden.

## License

MIT
