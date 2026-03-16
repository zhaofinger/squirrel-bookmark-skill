#!/usr/bin/env bun
/**
 * Squirrel Bookmark Helper Script - 网页内容抓取
 *
 * 只负责抓取原始内容，不做结构化提取。
 * title、summary、tags 等字段由 AI 生成。
 *
 * 抓取优先级：
 * 1. defuddle.md - 返回 Markdown + YAML frontmatter
 * 2. r.jina.ai - 返回 Markdown 格式文本
 * 3. Browser Fallback - 返回 HTML 内容
 *
 * 环境变量：
 * - JINA_API_KEY: r.jina.ai 的 API Key（可选）
 */

const REQUEST_TIMEOUT = 30000; // 30秒超时

interface FetchResult {
  url: string;
  content: string;  // 原始抓取内容（markdown 或 html）
  contentType: 'markdown' | 'html';
  success: boolean;
  source: 'defuddle' | 'jina' | 'browser' | 'none';
  error?: string;
}

// 带超时的 fetch
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

// 尝试从 defuddle.md 抓取
async function fetchWithDefuddle(url: string): Promise<FetchResult | null> {
  try {
    const response = await fetchWithTimeout(`https://defuddle.md/${url}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();

    return {
      url,
      content,
      contentType: 'markdown',
      success: true,
      source: 'defuddle',
    };
  } catch (error) {
    console.error(`defuddle.md 抓取失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 尝试从 r.jina.ai 抓取
async function fetchWithJina(url: string): Promise<FetchResult | null> {
  const jinaApiKey = process.env.JINA_API_KEY;

  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
      console.error('使用 Jina API Key 进行认证抓取');
    } else {
      console.error('使用 Jina 免费端点（未配置 API Key）');
    }

    const response = await fetchWithTimeout(jinaUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('Jina API Key 无效或已过期');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // jina.ai 返回纯文本 Markdown
    const content = await response.text();

    return {
      url,
      content,
      contentType: 'markdown',
      success: true,
      source: 'jina',
    };
  } catch (error) {
    console.error(`r.jina.ai 抓取失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 备用：直接获取 HTML
async function fetchWithBrowserFallback(url: string): Promise<FetchResult | null> {
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
      url,
      content,
      contentType: 'html',
      success: true,
      source: 'browser',
    };
  } catch (error) {
    console.error(`Browser fallback 抓取失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 主抓取函数 - 只获取原始内容
async function fetchPage(url: string): Promise<FetchResult> {
  // 1. 尝试 defuddle.md
  console.error('尝试使用 defuddle.md 抓取...');
  const defuddleResult = await fetchWithDefuddle(url);
  if (defuddleResult) {
    console.error('✓ defuddle.md 抓取成功');
    return defuddleResult;
  }

  // 2. 尝试 r.jina.ai
  console.error('尝试使用 r.jina.ai 抓取...');
  const jinaResult = await fetchWithJina(url);
  if (jinaResult) {
    console.error('✓ r.jina.ai 抓取成功');
    return jinaResult;
  }

  // 3. 使用 browser fallback
  console.error('尝试使用 browser fallback 抓取...');
  const browserResult = await fetchWithBrowserFallback(url);
  if (browserResult) {
    console.error('✓ browser fallback 抓取成功');
    return browserResult;
  }

  // 全部失败
  return {
    url,
    content: '',
    contentType: 'html',
    success: false,
    source: 'none',
    error: '所有抓取方式均失败',
  };
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.log(JSON.stringify({
      error: "Usage: bun fetch-page.ts <URL>",
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // 验证 URL 格式
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.log(JSON.stringify({
      error: "无效的 URL 格式",
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // 验证 URL 协议
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    console.log(JSON.stringify({
      error: "不支持的 URL 协议，仅支持 HTTP 和 HTTPS",
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // 验证 URL 长度
  if (url.length > 2048) {
    console.log(JSON.stringify({
      error: "URL 过长（最大 2048 字符）",
      url,
      success: false,
      source: 'none',
    }, null, 2));
    process.exit(1);
  }

  // SSRF 防护：阻止访问内网地址
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fe80:')) {
    console.log(JSON.stringify({
      error: "不允许访问内网地址",
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
