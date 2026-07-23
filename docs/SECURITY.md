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

首次提交时，浏览器生成 64 位十六进制随机 token，并在提交成功后保存到 localStorage。前端会按姓名保存多个本地 token；同一浏览器换一个新名字提交时会创建新 token，避免把前一个参与者覆盖掉。

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

按姓名搜索会返回该显示姓名最近一次提交的可用时段。这个功能不暴露 token hash 或 service-role key，但它不适合作为身份验证方式，也不满足“姓名只有组织者能看到”的严格隐私目标。

“清空记录”不是按姓名任意删除。前端必须同时发送当前姓名和本浏览器保存的 participant token；Edge Function 哈希 token 后调用 `clear_submission` RPC，只删除 token hash 和显示姓名同时匹配的记录。

公开统计页只返回人数矩阵，不返回参与者姓名。若要做到“姓名和备注只有组织者能看到”，应移除公开按姓名搜索，或将它改回仅依赖 localStorage participant token 的恢复机制。

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
- 同一浏览器内的多姓名 token 只是为了避免多人共用设备或测试时互相覆盖，不是账号系统。
- token 泄露后，持有者可更新对应提交。
- 公开 Edge Functions 需要部署平台层面的限流和监控。
