# Squirrel Bookmark Skill

将网页 URL 添加到 Squirrel 智能收藏夹的 Claude Skill。

## 功能

- 抓取网页内容（标题、正文、描述）
- 保存到 Squirrel 收藏夹
- 返回保存结果和访问链接

## 触发方式

- 用户说"添加收藏"、"保存网页"、"收藏这个链接"
- System Prompt 中指定执行收藏动作

## 配置

需要以下信息：

1. **SQUIRREL_API_ENDPOINT** - API 地址（如：`https://your-domain.com/api/bookmarks`）
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

使用三级降级抓取策略，确保最大程度获取页面内容：

1. **defuddle.md** - 结构化网页内容提取
2. **r.jina.ai** - AI 驱动的内容提取服务（支持 API Key 认证）
3. **Browser Fallback** - 直接 HTTP 请求获取基础信息

脚本会自动依次尝试，直到成功为止。

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

**Claude：** 将自动：
1. 抓取网页内容
2. 提取标题和描述
3. 调用 Squirrel API 保存
4. 返回结果和访问链接
