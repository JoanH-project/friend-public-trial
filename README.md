# Friend Public Trial

朋友之间使用的、明确虚构的多人实时恶搞审判页。默认案件在 `/case/demo`；首页会跳转至此处。请只使用自愿参与者的轻松玩笑内容，勿放入真实严重指控或个人隐私。

## 功能

- 手机优先的赛博法庭/档案视觉
- 全局讨伐热度与四档无限投票
- Supabase RPC 原子自增与 Realtime 同步
- 公开追加“罪状”投稿，所有在线访客实时可见
- 连击、里程碑、数字/按钮动画和减少动画偏好
- GUILTY 盖章与纯前端申诉彩蛋
- 未配置环境变量时可先使用演示模式预览

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。配置 Supabase 前，按钮仅会修改本地演示数据，不会与其他设备同步。

## Supabase 配置

1. 新建 Supabase 项目，在 **SQL Editor** 执行完整的 [`supabase/schema.sql`](./supabase/schema.sql)。脚本会创建三张表、索引、RLS 只读策略、两个安全的原子递增 RPC、Realtime publication 和 demo 种子数据。
2. 在 Project Settings → API 复制 Project URL 和 anon key。
3. 在 `.env.local` 填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

重启开发服务器。`increment_heat` / `increment_vote` 会在数据库内执行 `count = count + 1`，因此不会因为并发点击丢失计数。Realtime 已在 SQL 中订阅 `cases` 和 `vote_options` 的更新。

已经运行过旧版 `schema.sql` 的项目，请额外执行一次 [`supabase/public-crimes.sql`](./supabase/public-crimes.sql)，以启用公共罪状投稿与其 Realtime 同步。

## 修改案件内容

在 Supabase 更新 `cases` 表中的 `name`、`title`、`avatar_url`、`punishment`；更新 `crimes` 和 `vote_options` 表即可。创建新案件时指定一个唯一 `slug`，然后访问 `/case/你的-slug`。头像 URL 失败时会优雅回退到默认 emoji。

## 部署 Vercel

推送到 GitHub 后在 Vercel 导入仓库；Framework 选 Next.js，并在 Vercel 的 Environment Variables 中加入与 `.env.local` 相同的两个 `NEXT_PUBLIC_` 变量。部署即可，不需要额外构建命令。

## 当前 TODO

- 演示头像目前使用 emoji；可在 Supabase 填 `avatar_url` 替换。
- 公共匿名计数器适合朋友局；上线公开大流量前应增加 Supabase Edge Function / 速率限制和反滥用保护。
