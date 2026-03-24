# Squirrel Bookmark Skill Package

This repository is a Vercel-style agent skills package for saving public web pages to Squirrel bookmarks.

## Included Skill

- `squirrel-bookmark`: fetches a public web page, generates bookmark metadata with AI, supports user-defined summary preferences, stores persistent summary preferences in `~/.config/squirrel-bookmark/preferences.json`, preserves raw fetched content without agent-side reconstruction, and saves it to the fixed Squirrel bookmark API.

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

If the user wants the preferences remembered for future bookmarks, the skill should persist them only in:

```text
~/.config/squirrel-bookmark/preferences.json
```

Saved preferences act as the baseline for later requests. One-off summary instructions should be applied only to the current request and should not update the file unless the user explicitly asks to remember them.

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

Run the save helper:

```bash
cd skills/squirrel-bookmark/scripts
bun run save --fetch-result /tmp/fetch-result.json --title "Example" --summary "Short summary" --tags "example,web"
```

Or run it from the repository root:

```bash
bun run skills/squirrel-bookmark/scripts/fetch-page.ts https://example.com
```

## Raw Content Integrity

When the skill is used by an agent, the raw page `content` is often the most fragile field because it can be re-escaped, truncated, or clipped if the agent manually rebuilds the bookmark JSON payload.

To avoid that, the intended flow is:

1. Save the fetch result JSON to a file.
2. Use AI only for `title`, `summary`, and `tags`.
3. Call `save-bookmark.ts` with the fetch result file so the raw `content` is read from disk and sent unchanged.

The agent should not reproduce the full `content` field inside model output.

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
