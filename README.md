# Squirrel Bookmark Skill

将网页 URL 添加到 Squirrel 智能收藏夹的 Claude Skill。

## 功能

- 抓取网页原始内容（Markdown/HTML）
- 根据执行环境能力生成/提取结构化字段（title、summary、tags）
- 保存到 Squirrel 收藏夹
- 返回保存结果和访问链接

## 触发方式

- 用户说"添加收藏"、"保存网页"、"收藏这个链接"
- System Prompt 中指定执行收藏动作

## 配置

需要以下信息：

1. **SQUIRREL_BASE_URL** - Squirrel 服务的基础 URL（默认：`https://squirrel-kappa.vercel.app`）
2. **SQUIRREL_API_TOKEN** - API Token（格式：`sq_xxxx...`）

## 文件结构

```
squirrel-bookmark/
├── SKILL.md              # Skill 主文件
├── README.md             # 说明文档
├── evals.json            # 测试用例
└── scripts/
    ├── package.json      # Bun 依赖配置
    └── fetch-page.ts     # 网页抓取脚本 (TypeScript + Bun)
```

## 打包发布

使用 Claude Skill Creator 打包：

```bash
# 进入 skill-creator 目录
python -m scripts.package_skill /path/to/squirrel-bookmark
```

生成 `.skill` 文件后可发布到 Skill 市场。

## 网页抓取策略

使用三级降级抓取策略：

1. **defuddle.md** - 返回 Markdown + YAML frontmatter
2. **r.jina.ai** - 返回 Markdown 格式文本（支持 API Key 认证）
3. **Browser Fallback** - 返回原始 HTML 内容

**注意：** 脚本只负责抓取原始内容。结构化字段（title、summary、tags）可根据执行环境能力选择生成方式：
- 有 AI 能力的环境：使用 AI 从 content 中提取
- 无 AI 能力的环境：从 YAML frontmatter 提取、正则提取或询问用户

### API Key 配置（可选）

如需使用更稳定的 r.jina.ai 付费端点，可配置 API Key：

```bash
export JINA_API_KEY="your-jina-api-key"
```

未配置时自动使用免费端点。

获取 API Key: https://jina.ai/api-dashboard

## 依赖

- [Bun](https://bun.sh/) - JavaScript/TypeScript 运行时
- Squirrel 服务（提供 API 端点）

### API 端点

收藏 API 端点固定为：`/api/bookmarks`

**默认地址：**
- 基础 URL: `https://squirrel-kappa.vercel.app`
- 完整 API: `https://squirrel-kappa.vercel.app/api/bookmarks`

需要配置：
- `SQUIRREL_BASE_URL` - 可选，默认为 `https://squirrel-kappa.vercel.app`
- `SQUIRREL_API_TOKEN` - 必需，如 `sq_xxxx...`

### 安装 Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 安装依赖

```bash
cd skills/squirrel-bookmark/scripts
bun install
```

## 使用示例

**用户：** 收藏这个链接 https://example.com/article

**AI 环境（如 Claude）：**
1. 抓取网页原始内容（Markdown/HTML）
2. 使用 AI 从内容中提取 title、summary、tags
3. 调用 Squirrel API 保存（字段：url, title, summary, content, tags）
4. 返回结果和访问链接

**非 AI 环境：**
1. 抓取网页原始内容
2. 尝试从 content 中提取 title（如 Markdown 第一行、YAML frontmatter）
3. 询问用户提供 tags
4. 调用 Squirrel API 保存
5. 返回结果和访问链接
