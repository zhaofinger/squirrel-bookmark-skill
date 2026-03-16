---
name: squirrel-bookmark
description: |
  将网页 URL 添加到 Squirrel 智能收藏夹。

  **触发时机：**
  - 用户明确说"添加收藏"、"保存网页"、"收藏这个链接"等
  - System Prompt 中指定执行收藏动作
  - 用户提供了 URL 并表达保存意愿

  **功能：**
  - 抓取网页内容（标题、正文）
  - 保存到 Squirrel 收藏夹
  - 返回保存结果和访问链接

  **注意：** 此 skill 依赖用户执行环境的 AI 能力来生成摘要，skill 本身只负责抓取和存储。
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
1. **defuddle.md** - 优先使用专业的网页内容提取服务
2. **r.jina.ai** - 如 defuddle 失败，使用 Jina AI 的内容提取服务
3. **Browser Fallback** - 如上述均失败，使用直接 HTTP 请求获取页面基础信息

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
  "title": "示例页面标题",
  "description": "页面描述",
  "content": "正文内容...",
  "success": true,
  "source": "defuddle"
}
```

**依赖：** 需要已安装 Bun

**注意：** 输出中的 `source` 字段表示实际使用的抓取方式（`defuddle`/`jina`/`browser`/`none`），便于调试和监控。

### 3. 生成摘要（可选）

如果用户环境支持 AI 能力，生成网页摘要：
- 摘要长度控制在 200 字以内
- 保留文章的核心观点

如果环境不支持 AI，使用 meta description 或正文前 200 字作为摘要。

### 4. 保存到 Squirrel

通过 API 将收藏数据提交到 Squirrel。API 端点固定为 `/api/bookmarks`：

```http
POST ${SQUIRREL_BASE_URL}/api/bookmarks
Authorization: Bearer <SQUIRREL_API_TOKEN>
Content-Type: application/json

{
  "url": "<原始URL>",
  "title": "<网页标题>",
  "description": "<摘要/描述>",
  "content": "<正文内容（可选）>"
}
```

### 5. 返回结果给用户

格式如下：

```markdown
## 收藏成功 ✅

**标题：** [网页标题]

**摘要：**
[生成的摘要内容]

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

## 示例对话

**用户：** 收藏这个链接 https://example.com/article

**Claude：**
1. 抓取 https://example.com/article 内容
2. 提取标题和正文
3. 生成摘要
4. 调用 Squirrel API 保存
5. 返回结果：

```
## 收藏成功 ✅

**标题：** 示例文章标题

**摘要：**
这是一篇关于 xxx 的文章，主要介绍了...

**访问地址：**
https://squirrel-kappa.vercel.app/bookmarks/123

**保存时间：** 2026-03-16 14:30:00
```

## 注意事项

1. **尊重 robots.txt** - 抓取前检查目标网站的 robots.txt 规则
2. **内容长度限制** - 正文内容建议限制在 50KB 以内，避免 API 传输过大
3. **重复检测** - 如 Squirrel API 支持，可先查询 URL 是否已存在
4. **隐私保护** - 不保存包含敏感信息的页面（如登录后的个人页面）
