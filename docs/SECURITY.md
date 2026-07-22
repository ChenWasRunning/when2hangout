# 安全说明

## 密钥边界

前端只允许使用：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

这些变量会进入 GitHub Pages/Vercel 构建产物。Supabase anon key 是公开客户端 key。

以下变量只能配置为 Supabase Edge Functions secrets：

```text
SUPABASE_SERVICE_ROLE_KEY
PARTICIPANT_TOKEN_PEPPER
```

service-role key 绝不能出现在前端代码、GitHub repository 或构建产物中。

## participant token

首次提交时，浏览器生成 64 位十六进制随机 token，并在提交成功后保存到 localStorage。

数据库不保存原始 token。Edge Function 计算：

```text
sha256(PARTICIPANT_TOKEN_PEPPER + ":" + participantToken)
```

数据库只保存哈希值 `participant_token_hash`。

## RLS

`participants` 和 `availability` 都启用 Row Level Security。migration 撤销 anon/authenticated 直接访问权限，并只授权 service-role 执行 RPC。

普通前端用户不能：

- 读取 `participant_token_hash`
- 读取完整参与者表
- 修改其他参与者提交
- 删除其他参与者
- 直接写入 availability

## Edge Functions

Edge Functions 使用 service-role key 调用数据库 RPC。这样可以在服务端完成 token 验证、数据校验和一致性更新，同时避免把 service-role key 暴露给浏览器。

## 一致性

更新提交时，`submit_availability` RPC 会：

1. upsert participant；
2. 删除该 participant 旧的 availability；
3. 插入本次提交的完整 slots；
4. 由数据库函数作为一次逻辑操作执行。

## 已知限制

- localStorage token 清除后无法找回原提交。
- 没有账号体系，不能跨浏览器识别同一人。
- token 泄露后，持有者可更新对应提交。
- 公开 Edge Functions 需要部署平台层面的限流和监控。
