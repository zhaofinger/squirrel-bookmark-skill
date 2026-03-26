#!/usr/bin/env bun
/**
 * Squirrel Bookmark Helper Script - raw page fetch only
 *
 * This helper only fetches raw page content.
 * It does not generate structured bookmark metadata.
 * `title`, `summary`, and `tags` must be produced by an AI-capable runtime.
 *
 * Fetch order:
 * 1. defuddle.md - returns Markdown + YAML frontmatter
 * 2. r.jina.ai - returns Markdown text
 * 3. browser fallback - returns HTML
 *
 * Environment variables:
 * - JINA_API_KEY: optional API key for r.jina.ai
 */

const REQUEST_TIMEOUT = 30000; // 30 second timeout

interface FetchAttempt {
  source: 'defuddle' | 'jina' | 'browser';
  error: string;
}

interface AttemptResult {
  result: FetchResult | null;
  error?: string;
}

interface FetchResult {
  url: string;
  content: string;  // Raw fetched content (Markdown or HTML)
  contentType: 'markdown' | 'html';
  success: boolean;
  source: 'defuddle' | 'jina' | 'browser' | 'none';
  error?: string;
  attempts?: FetchAttempt[];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const bareHostname = normalized.replace(/^\[(.*)\]$/, '$1');

  if (
    bareHostname === 'localhost' ||
    bareHostname.endsWith('.localhost') ||
    bareHostname.endsWith('.local') ||
    bareHostname.endsWith('.internal') ||
    bareHostname === '127.0.0.1' ||
    bareHostname === '0.0.0.0' ||
    bareHostname === '::1' ||
    bareHostname.startsWith('10.') ||
    bareHostname.startsWith('192.168.') ||
    bareHostname.startsWith('169.254.') ||
    bareHostname.startsWith('0.')
  ) {
    return true;
  }

  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(bareHostname)) {
    return true;
  }

  if (/^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(bareHostname)) {
    return true;
  }

  if (/^(fc|fd)[0-9a-f]{2}:/i.test(bareHostname) || /^fe80:/i.test(bareHostname)) {
    return true;
  }

  return false;
}

// Fetch with timeout.
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Try fetching via defuddle.md.
async function fetchWithDefuddle(url: string): Promise<AttemptResult> {
  try {
    const response = await fetchWithTimeout(`https://defuddle.md/${url}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();

    return {
      result: {
        url,
        content,
        contentType: 'markdown',
        success: true,
        source: 'defuddle',
      },
    };
  } catch (error) {
    const message = formatError(error);
    console.error(`defuddle.md fetch failed: ${message}`);
    return { result: null, error: message };
  }
}

// Try fetching via r.jina.ai.
async function fetchWithJina(url: string): Promise<AttemptResult> {
  const jinaApiKey = process.env.JINA_API_KEY;

  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const headers: Record<string, string> = {
      'Accept': 'text/plain, text/markdown;q=0.9, */*;q=0.8',
    };

    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
      console.error('Using Jina API key for authenticated fetch');
    } else {
      console.error('Using the Jina free endpoint without an API key');
    }

    const response = await fetchWithTimeout(jinaUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('Jina API key is invalid or expired');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // jina.ai returns plain text Markdown.
    const content = await response.text();

    return {
      result: {
        url,
        content,
        contentType: 'markdown',
        success: true,
        source: 'jina',
      },
    };
  } catch (error) {
    const message = formatError(error);
    console.error(`r.jina.ai fetch failed: ${message}`);
    return { result: null, error: message };
  }
}

// Fallback: fetch raw HTML directly.
async function fetchWithBrowserFallback(url: string): Promise<AttemptResult> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();

    return {
      result: {
        url,
        content,
        contentType: 'html',
        success: true,
        source: 'browser',
      },
    };
  } catch (error) {
    const message = formatError(error);
    console.error(`Browser fallback fetch failed: ${message}`);
    return { result: null, error: message };
  }
}

// Main fetch flow: return raw content only.
async function fetchPage(url: string): Promise<FetchResult> {
  const attempts: FetchAttempt[] = [];

  // 1. Try defuddle.md.
  console.error('Trying defuddle.md...');
  const defuddleAttempt = await fetchWithDefuddle(url);
  if (defuddleAttempt.result) {
    console.error('✓ defuddle.md fetch succeeded');
    return defuddleAttempt.result;
  }
  attempts.push({ source: 'defuddle', error: defuddleAttempt.error ?? 'Fetch failed' });

  // 2. Try r.jina.ai.
  console.error('Trying r.jina.ai...');
  const jinaAttempt = await fetchWithJina(url);
  if (jinaAttempt.result) {
    console.error('✓ r.jina.ai fetch succeeded');
    return jinaAttempt.result;
  }
  attempts.push({ source: 'jina', error: jinaAttempt.error ?? 'Fetch failed' });

  // 3. Try browser fallback.
  console.error('Trying browser fallback...');
  const browserAttempt = await fetchWithBrowserFallback(url);
  if (browserAttempt.result) {
    console.error('✓ browser fallback fetch succeeded');
    return browserAttempt.result;
  }
  attempts.push({ source: 'browser', error: browserAttempt.error ?? 'Fetch failed' });

  // All fetch methods failed.
  return {
    url,
    content: '',
    contentType: 'html',
    success: false,
    source: 'none',
    error: 'All fetch methods failed',
    attempts,
  };
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.log(JSON.stringify({
      error: '用法：bun fetch-page.ts <URL>',
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // Validate URL format.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.log(JSON.stringify({
      error: 'Invalid URL format',
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // Validate URL scheme.
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    console.log(JSON.stringify({
      error: 'Unsupported URL scheme. Only HTTP and HTTPS are allowed',
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // Validate URL length.
  if (url.length > 2048) {
    console.log(JSON.stringify({
      error: 'URL is too long (maximum 2048 characters)',
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // SSRF guard: block localhost, link-local, and common private network addresses.
  const hostname = parsedUrl.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    console.log(JSON.stringify({
      error: 'Private or internal network addresses are not allowed',
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  const result = await fetchPage(url);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();
