# Squirrel Bookmark Skill 包

这个仓库是一个 Vercel 风格的 agent skill 包，用于把公开网页保存到 Squirrel 书签。

## 包含的 Skill

- `squirrel-bookmark`：抓取公开网页，使用 AI 生成书签元数据，支持用户自定义摘要偏好，将持久化摘要偏好保存在 `~/.config/squirrel-bookmark/preferences.json`，并直接使用抓取结果中的原始内容完成保存。

## 仓库结构

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

## 安装

从这个仓库安装指定 skill：

```bash
npx skills add zhaofinger/squirrel-bookmark-skill --skill squirrel-bookmark
```

如果该仓库已经被识别为仅包含一个 skill，也可以直接安装整个仓库：

```bash
npx skills add zhaofinger/squirrel-bookmark-skill
```

## 运行要求

- 运行时必须提供 `SQUIRREL_API_TOKEN`。
- 运行时必须具备 AI 能力。
- 运行本地抓取脚本需要 Bun。
- `JINA_API_KEY` 为可选项。

## 摘要定制

这个 skill 提供合理的默认行为，但用户也可以按请求自定义摘要生成方式。

支持的摘要选项：

- `language`
- `format`
- `style`
- `length`

示例请求：

```text
把这个页面保存到 Squirrel，并用中文写摘要。
```

```text
收藏这个 URL。摘要请用英文，写成一小段技术风格内容。
```

```text
保存这个页面，摘要用中性风格，写长一点，大约 120 字。
```

回复中还应展示实际应用的摘要偏好，方便用户核对。

如果用户希望这些偏好用于以后的书签，skill 会将它们保存在：

```text
~/.config/squirrel-bookmark/preferences.json
```

已保存的偏好会作为后续请求的基线。一次性摘要指令只应用于当前请求；只有在用户明确要求记住时才更新该文件。

## 本地开发

安装 Bun 依赖：

```bash
cd skills/squirrel-bookmark/scripts
bun install
```

运行抓取脚本：

```bash
cd skills/squirrel-bookmark/scripts
bun run fetch https://example.com
```

运行保存脚本：

```bash
cd skills/squirrel-bookmark/scripts
bun run save --fetch-result /tmp/fetch-result.json --title "Example" --summary "Short summary" --tags "example,web"
```

或者在仓库根目录直接运行：

```bash
bun run skills/squirrel-bookmark/scripts/fetch-page.ts https://example.com
```

## 原始内容完整性

当 agent 使用这个 skill 时，页面原始 `content` 往往是最脆弱的字段，因为一旦由 agent 手动重建书签 JSON payload，就可能被重新转义、截断或裁剪。

为了避免这个问题，推荐流程是：

1. 将抓取结果 JSON 保存到文件。
2. 只用 AI 生成 `title`、`summary` 和 `tags`。
3. 使用抓取结果文件调用 `save-bookmark.ts`，让原始 `content` 直接从磁盘读取并原样发送。

agent 应直接使用抓取结果中的原始 `content`，通过保存脚本完成提交。

## 发布与发现

`skills.sh` 没有单独的发布命令。要让 skill 可被发现：

1. 将 skill 保存在公开的 Git 仓库中。
2. 确保 skill 文件夹名与 `SKILL.md` 中的 `name` 一致。
3. 把安装命令分享给用户。
4. 用户通过 `npx skills add` 安装后，它可以通过安装遥测出现在 `skills.sh` 搜索结果中。

## 安全性

- 这个 skill 只接受公开的 `http` 和 `https` URL。
- 会拒绝 localhost、链路本地地址和私有网络地址。

## 许可证

MIT
