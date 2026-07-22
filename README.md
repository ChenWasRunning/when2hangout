# When2Hangout｜聚会时间统计

一个适合分享到微信群的聚会时间收集网页。第一版只服务于一次固定活动：收集朋友们在 `2026-07-27` 至 `2026-08-30` 之间午餐和晚餐的可用时间。

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS
- Supabase Postgres + Row Level Security
- Supabase Edge Functions
- Vitest + React Testing Library
- ESLint + Prettier
- GitHub Pages 部署，Vercel 可选

## 功能

- 固定显示五个自然周，每周从星期一到星期日。
- 每天只有两个时段：午餐、晚餐。
- 支持点击单格切换，也支持按住拖过多个格子进行涂抹选择。
- 支持在每周右上角一键清空该周已选择的午餐/晚餐。
- 参与者先选择时间，再在页面底部输入名字并点击提交。
- 点击提交前不会写入 Supabase。
- 首次成功提交后，浏览器 localStorage 保存随机 participant token。
- 数据库只保存 token 的服务端哈希，不保存原始 token。
- 同一浏览器再次打开可恢复此前提交，并通过“更新提交”替换旧结果。
- 统计页展示总提交人数、每个时段人数、最佳时间前 10 名和可用名单。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 需要前端可公开的 Supabase anon 配置：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

不要把 service-role key 放进 `.env.local` 或任何 `VITE_` 变量。

## Supabase 项目创建

1. 在 Supabase 创建新项目。
2. 在 Project Settings > API 中复制：
   - Project URL
   - anon public key
3. 将二者填入 GitHub Pages 或 Vercel 的前端环境变量。
4. service-role key 只用于 Edge Functions secrets。

## 执行 SQL migration

安装 Supabase CLI 后，在仓库根目录执行：

```bash
supabase link --project-ref your-project-ref
supabase db push
```

migration 文件位于：

```text
supabase/migrations/20260722000000_initial_schema.sql
```

它会创建：

- `participants`
- `availability`
- `meal_type`
- `submit_availability`
- `get_my_submission`
- `get_public_stats`
- RLS、约束、触发器和 RPC 权限

## Edge Functions 部署

设置服务端 secrets：

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set PARTICIPANT_TOKEN_PEPPER=replace-with-a-long-random-secret
```

部署函数：

```bash
supabase functions deploy submit-availability
supabase functions deploy my-submission
supabase functions deploy stats
```

Edge Functions 用途：

- `submit-availability`：验证姓名、token、slots，哈希 token，调用数据库事务式 RPC。
- `my-submission`：用 token 哈希读取当前浏览器参与者自己的提交。
- `stats`：返回统计页需要的聚合数据，不暴露 token hash 或内部字段。

## GitHub Pages 部署

1. 在 GitHub repository settings 中设置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. 进入 Settings > Pages。
3. Source 选择 GitHub Actions。
4. push 到 `main` 后 workflow 会执行：
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - 上传 `dist`

部署后地址通常为：

```text
https://chenwasrunning.github.io/when2hangout/
```

## Vercel 可选部署

1. 在 Vercel 导入 `ChenWasRunning/when2hangout`。
2. Framework Preset 选择 Vite。
3. Build Command 使用 `npm run build`。
4. Output Directory 使用 `dist`。
5. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Vercel 不需要改变 Supabase Edge Functions 的部署方式。

## 安全模型

前端只使用 Supabase anon key。anon key 是公开客户端 key，不是敏感密钥。

原始 participant token 由浏览器生成，只保存在 localStorage。提交时发送给 Edge Function，Edge Function 使用 `PARTICIPANT_TOKEN_PEPPER` 计算 SHA-256 哈希。数据库只保存：

```text
participant_token_hash
```

数据库启用 RLS，并撤销 anon/authenticated 对 `participants` 和 `availability` 的直接访问。普通前端用户不能直接读取 token hash、修改他人记录或删除他人数据。

`submit_availability` RPC 会在一次数据库函数调用中更新参与者姓名、删除旧 availability、插入本次完整选择。这样更新提交时后台最终记录与本次完整提交一致。

已知限制：

- localStorage 被清除后，用户会被视为新参与者。
- 第一版没有账号系统和找回功能。
- Edge Functions 允许公开调用，需要在生产环境结合 Supabase rate limit、域名限制或 WAF 策略。
- 如果 token 泄露，持有者可以修改同一参与者提交。

更多说明见 [docs/SECURITY.md](docs/SECURITY.md)。

## 测试和构建命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

测试覆盖：

- 固定日期范围与五周拆分
- 午餐/晚餐 slot 生成
- 周末识别
- 选择/取消选择
- 姓名校验
- 点击提交前不保存
- 提交成功/失败状态
- participant token 恢复旧结果
- 更新提交替换旧结果
- 统计排序规则

## 微信内置浏览器测试建议

- 用 360px、390px、430px 宽度测试页面。
- 确认可选单元格触控区域足够大，不需要缩放。
- 在微信内打开 GitHub Pages 或 Vercel 链接，完成一次提交。
- 测试按住一个午餐/晚餐格子拖过其它格子，确认可以连续涂抹。
- 测试每周右上角“清空”，确认只清空当前周。
- 关闭页面后再次打开，确认 localStorage token 能恢复旧提交。
- 从另一台手机打开同一链接，确认作为新参与者提交。
- 打开统计页，确认人数和名单正确更新。
