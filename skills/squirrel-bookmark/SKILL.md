---
name: squirrel-bookmark
description: 将公开网页 URL 保存到 Squirrel 书签。适用于用户要求保存、收藏、添加网页到 Squirrel，要求按指定语言、格式、风格、长度生成摘要并记住这些偏好，或仅发送一个链接且没有任何额外说明时。抓取页面内容，使用 AI 生成 `title`、`summary`、`tags`，将持久化摘要偏好保存在 `~/.config/squirrel-bookmark/preferences.json`。
---

# Squirrel Bookmark

## 固定规则

- 要求运行时提供 `SQUIRREL_API_TOKEN`。
- 要求运行时具备 AI 能力；没有 AI 能力时立即停止并返回不可用错误。
- 将持久化摘要偏好保存到 `~/.config/squirrel-bookmark/preferences.json`。
- 将抓取结果文件视为原始 `content` 的唯一可信来源。
- 保持原始 `content` 不被模型复现、改写、重新转义、裁剪或手动重建。

## 执行流程

### 1. 校验请求

- 缺少 URL 时先向用户索取 URL。
- 拒绝无效 URL、不支持的 scheme、私有地址和内网地址。
- 读取请求中的摘要偏好：`language`、`format`、`style`、`length`。
- 如果用户要求记住、保存、更新或复用摘要偏好，读写 `~/.config/squirrel-bookmark/preferences.json`。
- 如果用户只提出一次性偏好且未要求保存，只用于当前请求，不修改偏好文件。
- 如果用户没有指定偏好，先读取已保存偏好；若仍不存在，再使用以下默认值：
  - `language`：优先跟随用户当前语言，不明确时用中文
  - `format`：单句或短段落，以最适合内容者为准
  - `style`：中性、事实性
  - `length`：简洁

### 2. 抓取页面

先创建临时文件并保存抓取结果：

```bash
FETCH_RESULT_FILE="$(mktemp)"
bun run scripts/fetch-page.ts "<URL>" > "$FETCH_RESULT_FILE"
```

- 依次使用 `defuddle.md`、`r.jina.ai`、浏览器兜底抓取。
- 期待抓取结果包含 `url`、`content`、`contentType`、`source`、`success`；失败时包含 `attempts`。
- `JINA_API_KEY` 为可选环境变量。
- 后续保存时直接使用该文件中的原始 `content`。

### 3. 生成元数据

只用 AI 生成以下字段：

- `title`
- `summary`
- `tags`，数量为 3 到 5 个

生成时遵循合并后的摘要偏好。

- 如果用户偏好与安全性、可靠性或 API 契约冲突，做最小必要调整并简要说明。

如果没有 AI 能力，返回：

```text
当前运行时无法使用此技能，因为生成书签元数据需要 AI 能力。
```

### 4. 保存书签

生成完 `title`、`summary`、`tags` 后，调用保存脚本：

```bash
bun run scripts/save-bookmark.ts \
  --fetch-result "$FETCH_RESULT_FILE" \
  --title "<generated title>" \
  --summary "<generated summary>" \
  --tags "<tag1>,<tag2>,<tag3>"
```

- 通过保存脚本提交书签请求。

### 5. 返回结果

成功后向用户返回消息包含以下字段：

- `title`
- `tags`
- `summary`
- `bookmark URL`
- `saved time`

## 失败处理

- 抓取失败：返回 `attempts` 中的错误。
- `SQUIRREL_API_TOKEN` 缺失或无效：返回鉴权或配置失败。
- AI 能力不可用：立即停止并返回不可用错误。
- 书签 API 报错：透出 API 错误并建议重试。
