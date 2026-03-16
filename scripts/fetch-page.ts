#!/usr/bin/env bun
/**
 * Squirrel Bookmark Helper Script - 多级抓取策略
 *
 * 抓取优先级：
 * 1. defuddle.md - 结构化抓取
 * 2. r.jina.ai - AI 内容提取（支持 API Key 认证）
 * 3. agent browser - 浏览器自动化（备用）
 *
 * 环境变量：
 * - JINA_API_KEY: r.jina.ai 的 API Key（可选，未配置时使用免费端点）
 * - DEFUDDLE_API_KEY: defuddle.md 的 API Key（如需要）
 */

interface FetchResult {
  url: string;
  title: string;
  description: string;
  content: string;
  success: boolean;
  source: 'defuddle' | 'jina' | 'browser' | 'none';
  error?: string;
}

// 尝试从 defuddle.md 抓取
async function fetchWithDefuddle(url: string): Promise<FetchResult | null> {
  try {
    // defuddle.md API 通常需要 POST 请求到特定端点
    // 这里假设是标准 API 格式，根据实际情况调整
    const response = await fetch('https://api.defuddle.md/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      url,
      title: data.title || data.headline || '未命名页面',
      description: data.description || data.summary || '',
      content: data.content || data.text || data.article || '',
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
    let jinaUrl: string;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (jinaApiKey) {
      // 使用带认证的 API 端点（更稳定、更高配额）
      jinaUrl = 'https://r.jina.ai/http://__url__'.replace('__url__', encodeURIComponent(url));
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
      console.error('使用 Jina API Key 进行认证抓取');
    } else {
      // 使用免费端点
      jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
      console.error('使用 Jina 免费端点（未配置 API Key）');
    }

    const response = await fetch(jinaUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('Jina API Key 无效或已过期');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // jina.ai 返回纯文本或 JSON，根据 Content-Type 判断
    const contentType = response.headers.get('content-type') || '';
    let title: string;
    let content: string;
    let description: string;

    if (contentType.includes('application/json')) {
      const data = await response.json();
      title = data.title || data.data?.title || '未命名页面';
      content = data.content || data.data?.content || data.text || '';
      description = data.description || data.excerpt || data.data?.description || '';
    } else {
      // 免费端点返回 Markdown 格式文本
      const text = await response.text();
      // 尝试从 Markdown 提取标题（通常是第一行的 # 标题）
      const titleMatch = text.match(/^#\s+(.+)$/m);
      title = titleMatch ? titleMatch[1].trim() : '未命名页面';
      content = text;
      // 提取前 200 字作为描述
      description = text.replace(/^#\s+.+$/m, '').trim().slice(0, 200);
    }

    return {
      url,
      title,
      description,
      content,
      success: true,
      source: 'jina',
    };
  } catch (error) {
    console.error(`r.jina.ai 抓取失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 备用：直接使用 fetch 获取（模拟 browser 获取基础信息）
async function fetchWithBrowserFallback(url: string): Promise<FetchResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '未命名页面';
    // 清理标题后缀
    title = title.replace(/\s*[\|\-–—]\s*[^|\-–—]{0,50}$/, '');

    // 提取描述
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // 提取正文（简化处理）
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    content = articleMatch?.[1] || mainMatch?.[1] || bodyMatch?.[1] || content;
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim()
      .slice(0, 10000);

    return {
      url,
      title,
      description,
      content,
      success: true,
      source: 'browser',
    };
  } catch (error) {
    console.error(`Browser fallback 抓取失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 主抓取函数
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
    title: '',
    description: '',
    content: '',
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
  try {
    new URL(url);
  } catch {
    console.log(JSON.stringify({
      error: "无效的 URL 格式",
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
