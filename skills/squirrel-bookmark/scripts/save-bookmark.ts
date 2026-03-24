#!/usr/bin/env bun
/**
 * Squirrel Bookmark Save Helper Script
 *
 * This helper sends a bookmark to the fixed Squirrel API endpoint.
 * It reads the raw page `content` directly from a fetch result JSON file so the
 * agent does not need to re-encode, trim, or reconstruct large page content.
 *
 * Required arguments:
 * --fetch-result <path>
 * --title <text>
 * --summary <text>
 * --tags <comma,separated,tags>
 *
 * Environment variables:
 * - SQUIRREL_API_TOKEN: required unless passed as --token
 */

const REQUEST_TIMEOUT = 30000;
const BOOKMARK_ENDPOINT = 'https://squirrel-kappa.vercel.app/api/bookmarks';

interface FetchResult {
  url: string;
  content: string;
  contentType: 'markdown' | 'html';
  success: boolean;
  source: 'defuddle' | 'jina' | 'browser' | 'none';
  error?: string;
}

interface SaveResult {
  success: boolean;
  endpoint: string;
  status: number | null;
  bookmarkUrl?: string;
  savedTime?: string;
  responseBody?: unknown;
  error?: string;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return undefined;
  }
  return args[index + 1];
}

function parseTags(tagsValue: string): string[] {
  const tags = tagsValue
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)];
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadFetchResult(path: string): Promise<FetchResult> {
  const raw = await Bun.file(path).text();
  const parsed = JSON.parse(raw) as Partial<FetchResult>;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Fetch result is not a JSON object');
  }

  if (parsed.success !== true) {
    throw new Error(`Fetch result is not successful${parsed.error ? `: ${parsed.error}` : ''}`);
  }

  if (typeof parsed.url !== 'string' || !parsed.url) {
    throw new Error('Fetch result is missing a valid url');
  }

  if (typeof parsed.content !== 'string') {
    throw new Error('Fetch result is missing raw content');
  }

  if (parsed.content.length === 0) {
    throw new Error('Fetch result content is empty');
  }

  if (parsed.contentType !== 'markdown' && parsed.contentType !== 'html') {
    throw new Error('Fetch result has an invalid contentType');
  }

  if (!['defuddle', 'jina', 'browser'].includes(parsed.source ?? '')) {
    throw new Error('Fetch result has an invalid source');
  }

  return parsed as FetchResult;
}

async function main() {
  const args = process.argv.slice(2);
  const fetchResultPath = getArgValue(args, '--fetch-result');
  const title = getArgValue(args, '--title');
  const summary = getArgValue(args, '--summary');
  const tagsValue = getArgValue(args, '--tags');
  const token = getArgValue(args, '--token') ?? process.env.SQUIRREL_API_TOKEN;

  if (!fetchResultPath || !title || !summary || !tagsValue) {
    console.log(JSON.stringify({
      success: false,
      endpoint: BOOKMARK_ENDPOINT,
      status: null,
      error: 'Usage: bun save-bookmark.ts --fetch-result <path> --title <text> --summary <text> --tags <comma,separated,tags> [--token <token>]',
    }, null, 2));
    process.exit(1);
  }

  if (!token) {
    console.log(JSON.stringify({
      success: false,
      endpoint: BOOKMARK_ENDPOINT,
      status: null,
      error: 'Missing SQUIRREL_API_TOKEN',
    }, null, 2));
    process.exit(1);
  }

  try {
    const fetchResult = await loadFetchResult(fetchResultPath);
    const tags = parseTags(tagsValue);

    if (tags.length < 1) {
      throw new Error('At least one tag is required');
    }

    const payload = {
      url: fetchResult.url,
      title,
      summary,
      content: fetchResult.content,
      tags,
    };

    const response = await fetchWithTimeout(BOOKMARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseBody: unknown = responseText;

    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }

    if (!response.ok) {
      console.log(JSON.stringify({
        success: false,
        endpoint: BOOKMARK_ENDPOINT,
        status: response.status,
        responseBody,
        error: `Bookmark API error: HTTP ${response.status}`,
      } satisfies SaveResult, null, 2));
      process.exit(1);
    }

    const parsedBody = responseBody && typeof responseBody === 'object'
      ? responseBody as Record<string, unknown>
      : null;

    console.log(JSON.stringify({
      success: true,
      endpoint: BOOKMARK_ENDPOINT,
      status: response.status,
      bookmarkUrl: typeof parsedBody?.bookmarkUrl === 'string'
        ? parsedBody.bookmarkUrl
        : typeof parsedBody?.url === 'string'
          ? parsedBody.url
          : undefined,
      savedTime: typeof parsedBody?.savedTime === 'string'
        ? parsedBody.savedTime
        : typeof parsedBody?.createdAt === 'string'
          ? parsedBody.createdAt
          : undefined,
      responseBody,
    } satisfies SaveResult, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      endpoint: BOOKMARK_ENDPOINT,
      status: null,
      error: formatError(error),
    } satisfies SaveResult, null, 2));
    process.exit(1);
  }
}

main();
