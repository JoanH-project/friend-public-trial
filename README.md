# Friend Public Trial

面向中国大陆网络的多人互动案件广场。保留 Next.js、App Router、Framer Motion 与现有移动端 UI；生产数据层使用腾讯云 CloudBase 文档数据库、云函数和 `watch()` 实时监听，不再依赖 Supabase 或 Vercel。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

未填 CloudBase 环境变量时，`/case/demo` 仍可用演示数据预览；不会同步给其他设备。

## CloudBase 配置

1. 创建 **云数据库**（不要选 PostgreSQL）环境，开启 Web 安全域名与匿名访问 / Publishable Key。
2. 在「环境管理 → API Key 配置」创建 Publishable Key，填入 `.env.local`：

```dotenv
NEXT_PUBLIC_TCB_ENV_ID=你的环境ID
NEXT_PUBLIC_TCB_ACCESS_KEY=你的PublishableKey
NEXT_PUBLIC_TCB_REGION=ap-shanghai
```

Publishable Key 可以暴露给浏览器；绝不能填入腾讯云 `SecretId` 或 `SecretKey`。

3. 创建 `cases`、`crimes`、`vote_options` 三个集合，并导入 [`cloudbase/seed-demo.json`](./cloudbase/seed-demo.json) 中对应的数据。`cases` 的 demo 文档 `_id` 必须为 `demo`。
4. 将 [`cloudbase/security-rules.json`](./cloudbase/security-rules.json) 的策略应用于三个集合：浏览器只读；全部写入经云函数完成。
5. 在 CloudBase 部署 `cloudfunctions/` 下的 `incrementHeat`、`incrementVote`、`createCase`、`createCrime`、`updateCase`。函数端使用管理员 SDK；两个 increment 函数固定调用 `command.inc(1)`，客户端无法传入增量。

页面通过 `watch()` 监听案件、罪状与投票集合；监听中断不会阻止云函数投票，下一次实时更新或刷新会恢复权威数据。

## 部署到 CloudBase 云托管

本仓库包含适用于 Next.js standalone 输出的 [`Dockerfile`](./Dockerfile)。在 CloudBase「云函数 / 托管」创建服务时：

- 端口：`3000`
- 开启公网访问
- 使用 GitHub 仓库或当前目录构建
- 配置与 `.env.local` 相同的三个 `NEXT_PUBLIC_TCB_*` 环境变量

CloudBase 的默认域名可用于测试；长期使用中国大陆自定义域名需按平台要求备案。Vercel 可以保留预览，但正式流量不依赖它。

## 安全边界

- 数据库集合对浏览器仅公开读取。
- 热度和票数只能由云函数执行原子 `inc(1)`。
- 云函数验证 ID 和字段长度，且不接受客户端定义 `incrementBy`。
- 头像当前使用默认 emoji 或已有 HTTPS URL；CloudBase Storage 可在后续单独接入。

请只使用参与者同意的轻松玩笑内容，避免真实严重指控、隐私或未经许可的照片。
