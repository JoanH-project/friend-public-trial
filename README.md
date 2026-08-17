# Friend Public Trial

一个可多人同时参与的轻松玩笑案件广场。访客可创建案件、上传头像、追加“罪状”、投票并实时看到热度变化。

> 仅用于参与者同意的轻松玩笑。请勿提交真实严重指控、个人隐私或未经许可的照片。

## 技术与部署

- 前端：Next.js 15、App Router、TypeScript、Framer Motion
- 数据：腾讯云 CloudBase PostgreSQL（RLS + 原子计数 RPC）
- 图片：CloudBase 云存储 `avatars` Bucket
- 生产部署：CloudBase 云托管（Docker / GitHub 自动部署）
- 线上分支：`codex/public-case-forum`

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中填入 CloudBase 环境信息：

```dotenv
NEXT_PUBLIC_TCB_ENV_ID=你的环境ID
NEXT_PUBLIC_TCB_ACCESS_KEY=你的PublishableKey
NEXT_PUBLIC_TCB_REGION=ap-shanghai
```

只使用 CloudBase 的 **Publishable Key**；不要写入腾讯云 `SecretId` 或 `SecretKey`。未配置时页面会使用演示案件，且不会与其他设备同步。

## 一次性 CloudBase 初始化

1. 在 CloudBase 创建 PostgreSQL 环境。
2. 打开「SQL 型数据库 → SQL 编辑器」，执行 [cloudbase/postgres-schema.sql](./cloudbase/postgres-schema.sql)。
3. 在「云存储」创建私有 Bucket：`avatars`；限制为 `image/*`、最大 2 MB。
4. 为 `avatars` 配置匿名访客可读、可上传的 RLS / 存储策略。
5. 在「环境管理 → API Key 配置」创建 Publishable Key，写入本地 `.env.local` 与云托管环境变量。
6. 在「环境管理 → 安全来源」加入网页域名。使用默认云托管域名时，填入该完整主机名（不带 `https://`）。

安全来源变更可能需要几分钟生效；未配置时浏览器会因跨域校验无法读写数据库或上传头像。

## 部署到 CloudBase 云托管

仓库包含可直接构建 Next.js standalone 输出的 [Dockerfile](./Dockerfile)。在 CloudBase「云函数 / 托管」中：

1. 用 GitHub 仓库部署，选择分支 `codex/public-case-forum`（合并后也可选择 `main`）。
2. 服务端口设置为 `3000`，并开启公网访问。
3. 添加这三个运行时环境变量：`NEXT_PUBLIC_TCB_ENV_ID`、`NEXT_PUBLIC_TCB_ACCESS_KEY`、`NEXT_PUBLIC_TCB_REGION`。
4. 开启 GitHub 自动部署；每次推送会触发新版本构建。

CloudBase 在容器运行后才注入环境变量。本项目通过 `/api/cloudbase-config` 将浏览器所需的 Publishable Key 配置在运行时提供，避免 Docker 构建阶段丢失配置。

默认云托管域名适合测试和分享；长期公开使用建议配置已备案的自定义域名与 HTTPS。

## 验证

```bash
npm run build
```

生产环境验证清单：

- 首页显示数据库中的案件，而非仅演示案件。
- 「创建新案件」可创建新人物和上传头像。
- 案件详情可追加罪状、增加热度、投票；其他设备刷新后可见更新。
