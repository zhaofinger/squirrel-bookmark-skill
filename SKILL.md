---
name: squirrel-bookmark
description: |
  将网页 URL 添加到 Squirrel 智能收藏夹。

  **触发时机：**
  - 用户明确说"添加收藏"、"保存网页"、"收藏这个链接"等
  - System Prompt 中指定执行收藏动作
  - 用户提供了 URL 并表达保存意愿

  **功能：**
  - 抓取网页原始内容（Markdown/HTML）
  - 生成或提取 title、summary、tags
  - 保存到 Squirrel 收藏夹
  - 返回保存结果和访问链接

  **注意：** 此 skill 可根据执行环境的能力选择不同的结构化字段生成方式。
---

# Squirrel 收藏 Skill

帮助用户将网页 URL 添加到 Squirrel 智能收藏夹。

## 使用前提

执行此 skill 前，确保以下信息已配置：

1. **SQUIRREL_BASE_URL** - Squirrel 服务的基础 URL（默认：`https://squirrel-kappa.vercel.app`）
2. **SQUIRREL_API_TOKEN** - API 认证 Token（格式：`sq_xxxx...`）

**固定 API 端点：** `/api/bookmarks`

完整 API URL 为：`${SQUIRREL_BASE_URL}/api/bookmarks`

**默认配置：**
- 基础 URL: `https://squirrel-kappa.vercel.app`
- API 端点: `https://squirrel-kappa.vercel.app/api/bookmarks`

这些信息可以通过以下方式提供：
- 用户直接告知
- 从环境变量读取：`SQUIRREL_BASE_URL`、`SQUIRREL_API_TOKEN`
- 从配置文件读取

## 工作流程

### 1. 获取必要信息

如果用户没有提供 URL，主动询问：
- "请提供要收藏的网页 URL"

检查是否已配置 API 信息，如未配置则询问用户。

### 2. 抓取网页内容

使用 Bun 运行抓取脚本，支持三级降级策略：

```bash
bun run scripts/fetch-page.ts "<URL>"
```

**抓取优先级：**
1. **defuddle.md** - 返回 Markdown + YAML frontmatter
2. **r.jina.ai** - 返回 Markdown 格式文本
3. **Browser Fallback** - 返回原始 HTML 内容

**脚本只返回原始内容**，不做结构化提取。

**API Key 配置（可选）：**

如需使用更稳定的 r.jina.ai 付费端点，可设置环境变量：
```bash
export JINA_API_KEY="your-jina-api-key"
```

未配置时自动使用免费端点。获取 API Key: https://jina.ai/api-dashboard

**脚本位置：** `skills/squirrel-bookmark/scripts/fetch-page.ts`

**执行示例：**
```bash
cd skills/squirrel-bookmark
bun run scripts/fetch-page.ts "https://example.com"
```

**输出示例：**
```json
{
  "url": "https://example.com",
  "content": "原始抓取内容（Markdown 或 HTML）...",
  "contentType": "markdown",
  "success": true,
  "source": "defuddle"
}
```

**输出字段说明：**
- `url` - 原始 URL
- `content` - 原始抓取内容（Markdown 或 HTML）
- `contentType` - 内容类型：`markdown` 或 `html`
- `source` - 抓取源：`defuddle`/`jina`/`browser`/`none`
- `success` - 是否抓取成功

### 3. 生成结构化字段

需要从抓取的 `content` 中生成以下字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **title** | 文章标题 | "React 18 新特性详解" |
| **summary** | 内容摘要（200字以内） | "本文介绍了 React 18 的并发特性、自动批处理..." |
| **tags** | 标签数组（3-5个） | ["react", "javascript", "frontend"] |

**根据执行环境选择生成方式：**

#### 方式 A：执行环境有 AI 能力（如 Claude、GPT 等）

使用 AI 从 content 中提取结构化字段：

```
请从以下网页内容中提取信息，返回 JSON 格式：
- title: 文章标题
- summary: 内容摘要（200字以内）
- tags: 相关标签（3-5个）

内容：
{content}
```

#### 方式 B：执行环境无 AI 能力

**选项 1：使用 r.jina.ai 的元数据**
r.jina.ai 免费端点返回的 Markdown 通常包含标题（第一行 `# 标题`），可以提取作为 title。

**选项 2：使用 defuddle.md 的 YAML frontmatter**
如果抓取源是 defuddle.md，可以从 YAML frontmatter 中提取 `title` 和 `excerpt` 字段。

**选项 3：简单的正则提取**
从 HTML 中提取 `<title>` 标签和 `<meta name="description">` 内容。

**选项 4：询问用户**
如果自动提取失败，可以询问用户手动提供标题和标签。

### 4. 保存到 Squirrel

通过 API 将收藏数据提交到 Squirrel。API 端点固定为 `/api/bookmarks`：

```http
POST ${SQUIRREL_BASE_URL}/api/bookmarks
Authorization: Bearer <SQUIRREL_API_TOKEN>
Content-Type: application/json

{
  "url": "<原始URL>",
  "title": "<生成的标题>",
  "summary": "<生成的摘要>",
  "content": "<原始抓取内容>",
  "tags": ["<标签1>", "<标签2>", "<标签3>"]
}
```

**必填字段：**
- `url` - 原始 URL
- `title` - 文章标题
- `summary` - 内容摘要
- `content` - 原始抓取内容（Markdown/HTML）
- `tags` - 标签数组

### 5. 返回结果给用户

格式如下：

```markdown
## 收藏成功 ✅

**标题：** [标题]

**标签：** #tag1 #tag2 #tag3

**摘要：**
[摘要内容]

**访问地址：**
[收藏详情页链接]

**保存时间：** [当前时间]
```

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| URL 无法访问 | 提示用户检查 URL 是否可访问 |
| API 认证失败 | 提示检查 API Token 是否正确 |
| 网页抓取超时 | 尝试简化抓取或提示用户手动输入 |
| API 返回错误 | 显示错误信息并建议重试 |
| 无法生成结构化字段 | 询问用户手动提供标题和标签 |

## 示例对话

**用户：** 收藏这个链接 https://example.com/article

**执行环境有 AI 时：**
1. 抓取 https://example.com/article 原始内容
2. 使用 AI 分析 content，生成 title、summary、tags
3. 调用 Squirrel API 保存
4. 返回结果：

```
## 收藏成功 ✅

**标题：** React 18 新特性详解

**标签：** #react #javascript #frontend

**摘要：**
本文详细介绍了 React 18 的主要新特性...

**访问地址：** https://squirrel-kappa.vercel.app/bookmarks/123
**保存时间：** 2026-03-16 14:30:00
```

**执行环境无 AI 时：**
1. 抓取 https://example.com/article 原始内容
2. 尝试从 content 中提取标题（Markdown 第一行 # 标题）
3. 询问用户："请为此文章添加标签（用逗号分隔）："
4. 调用 Squirrel API 保存
5. 返回结果

## 注意事项

1. **尊重 robots.txt** - 抓取前检查目标网站的 robots.txt 规则
2. **内容长度限制** - 正文内容建议限制在 50KB 以内，避免 API 传输过大
3. **重复检测** - 如 Squirrel API 支持，可先查询 URL 是否已存在
4. **隐私保护** - 不保存包含敏感信息的页面（如登录后的个人页面）
5. **字段生成质量** - 根据执行环境能力选择合适的方式生成结构化字段
