---
name: squirrel-bookmark
license: MIT
metadata:
  version: 1.1.0
  repository: https://github.com/zhaofinger/squirrel-bookmark-skill
  category: productivity
description: |
  Save a web page URL to Squirrel bookmarks.

  Trigger when the user wants to save, bookmark, or add a URL to Squirrel.

  The skill:
  - fetches page content
  - uses AI to generate `title`, `summary`, and `tags`
  - supports user-defined summary preferences such as language, format, style, and length
  - stores persistent user summary preferences in a fixed file: `~/.config/squirrel-bookmark/preferences.json`
  - saves the bookmark through the fixed Squirrel API endpoint
---

# Squirrel Bookmark Skill

Save a public web page to Squirrel bookmarks.

## Requirements

- `SQUIRREL_API_TOKEN` must be available.
- The runtime must have AI capability for structured extraction.
- The bookmark API endpoint is fixed: `https://squirrel-kappa.vercel.app/api/bookmarks`
- Persistent user summary preferences must be stored only in `~/.config/squirrel-bookmark/preferences.json`
- Do not accept a user-defined Squirrel API URL.

## Workflow

### 1. Validate input

- If no URL is provided, ask for one.
- Reject invalid URLs, unsupported schemes, and private/internal addresses.
- Accept optional user preferences for summary generation.
- When the user asks to remember, save, update, or reuse summary preferences, persist them to `~/.config/squirrel-bookmark/preferences.json`.

Supported summary preferences:
- `language`, for example `English`, `Chinese`, or `Japanese`
- `format`, for example `sentence`, `paragraph`, or `bullets`
- `style`, for example `neutral`, `technical`, `concise`, or `detailed`
- `length`, for example a character target, word target, or labels such as `short` and `long`

If the user does not specify preferences, use defaults:
- `language`: match the user's language when clear, otherwise English
- `format`: plain sentence or short paragraph, whichever best fits the content
- `style`: neutral and factual
- `length`: concise

Persistent preference rules:
- Use exactly one file for saved user summary preferences: `~/.config/squirrel-bookmark/preferences.json`
- Do not write the same preference data to any other file, database, or alternate path
- Treat the file as user-level state for this skill, not as bookmark content
- Load saved preferences from this file before applying defaults
- If the user provides new preferences for future use, update this file and then apply the merged preferences to the current request
- If the user provides one-off preferences without asking to save them, apply them only to the current request and do not modify the file

### 2. Fetch page content

Run:

```bash
bun run scripts/fetch-page.ts "<URL>"
```

Fetch order:
1. `defuddle.md`
2. `r.jina.ai`
3. browser fallback

The script returns raw page content only. It does not call the bookmark API.

Expected fields:
- `url`
- `content`
- `contentType`
- `source`
- `success`
- `attempts` on failure

Optional env var:
- `JINA_API_KEY`

### 3. Generate structured fields with AI

Use AI to generate:
- `title`
- `summary`
- `tags` with 3 to 5 items

Honor any user-provided summary preferences for language, format, style, and length.
When saved preferences exist in `~/.config/squirrel-bookmark/preferences.json`, use them as the baseline before applying request-specific overrides.
If a user preference conflicts with safety, reliability, or the bookmark API contract, keep the output safe and explain the adjustment briefly.

Default summary behavior when no preference is provided:
- concise
- factual
- easy to scan
- suitable for bookmark recall rather than full content replacement

If the runtime does not have AI capability, stop immediately and return an unavailable error. Do not fall back to manual rules, HTML parsing, or user follow-up for these fields.

Suggested error:

```text
This skill is unavailable in the current runtime because AI capability is required to generate bookmark metadata.
```

### 4. Save to Squirrel

Send:

```http
POST https://squirrel-kappa.vercel.app/api/bookmarks
Authorization: Bearer <SQUIRREL_API_TOKEN>
Content-Type: application/json

{
  "url": "<original URL>",
  "title": "<generated title>",
  "summary": "<generated summary>",
  "content": "<raw fetched content>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}
```

Required fields:
- `url`
- `title`
- `summary`
- `content`
- `tags`

### 5. Return result

Return:
- title
- tags
- summary
- applied summary preferences
- bookmark URL
- saved time

Expose the applied summary preferences in the response so the user can see what was used for:
- language
- format
- style
- length

If the user asked for custom summary settings, confirm whether they were applied exactly or adjusted.

## Error Handling

- Invalid URL or private/internal address: reject directly.
- Fetch failure: report the errors from `attempts`.
- Missing or invalid `SQUIRREL_API_TOKEN`: report auth/config failure.
- No AI capability: return unavailable and stop.
- Bookmark API error: surface the API error and suggest retrying.

## Constraints

- This is an agent skill, not a configurable end-user tool.
- Do not change or override the bookmark API endpoint.
- Store only data required for the bookmark task.
- If user summary preferences are persisted, store them only in `~/.config/squirrel-bookmark/preferences.json`.
