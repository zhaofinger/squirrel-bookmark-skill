---
name: squirrel-bookmark
description: |
  将网页 URL 添加到 Squirrel 智能收藏夹。

  触发时机：
  - 用户明确要求“添加收藏”、“保存网页”、“收藏这个链接”
  - 用户提供 URL 并表达保存意愿
  - 上下文要求把网页保存到 Squirrel

  功能：
  - 抓取网页原始内容（Markdown/HTML）
  - 生成或提取 title、summary、tags
  - 使用固定 API 端点保存到 Squirrel
---

# Squirrel 收藏 Skill

将网页内容抓取并保存到固定的 Squirrel 收藏 API。

## 前提

- 必须提供 `SQUIRREL_API_TOKEN`
- 收藏 API 端点固定为 `https://squirrel-kappa.vercel.app/api/bookmarks`
- 不接受用户自定义 Squirrel API 地址

## 执行步骤

### 1. 获取输入

- 如果没有 URL，询问用户：
- "请提供要收藏的网页 URL"
- 如果没有 API Token，询问用户提供 `SQUIRREL_API_TOKEN`

### 2. 抓取网页内容

运行：

```bash
bun run scripts/fetch-page.ts "<URL>"
```

抓取优先级：
1. `defuddle.md`
2. `r.jina.ai`
3. browser fallback

脚本只返回原始内容，不负责调用收藏 API。

输出字段：
- `url`
- `content`
- `contentType`
- `source`
- `success`
- `attempts`，仅在抓取失败时返回

可选环境变量：
- `JINA_API_KEY`

### 3. 生成结构化字段

从抓取结果中生成：
- `title`
- `summary`，200 字以内
- `tags`，3 到 5 个

优先使用运行环境的 AI 能力提取。如果没有 AI 能力，再按以下顺序降级：
1. 读取 Markdown 第一行标题
2. 读取 defuddle 的 YAML frontmatter
3. 从 HTML 提取 `<title>` 与描述
4. 询问用户补充标题或标签

### 4. 保存到 Squirrel

调用固定端点：

```http
POST https://squirrel-kappa.vercel.app/api/bookmarks
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

- 必填字段：`url`、`title`、`summary`、`content`、`tags`

### 5. 返回结果

返回：
- 标题
- 标签
- 摘要
- 收藏访问地址
- 保存时间

## 错误处理

- URL 无效或是私网地址：直接拒绝
- 抓取失败：报告 `attempts` 中的失败原因
- API 认证失败：提示检查 `SQUIRREL_API_TOKEN`
- 无法生成结构化字段：询问用户补充
- API 返回错误：转述错误并建议重试

## 约束

- 这是面向 agent 的 skill，不是通用用户配置化工具
- 不允许覆盖收藏 API 端点
- 只保存与收藏任务直接相关的数据
