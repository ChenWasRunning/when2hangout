# 私有姓名与备注导出方案

公开统计页只应返回人数矩阵。姓名、备注、participant token hash、participant id 等字段不应进入 GitHub Pages 前端、公开统计接口或构建产物。

## 推荐方案

使用一个组织者专用导出链路：

```text
Supabase Postgres
  -> owner-export Edge Function
  -> GitHub Actions 手动任务
  -> 加密 JSON/CSV 文件
  -> 私有 GitHub repository 或 public repo 中的 .age/.gpg 密文文件
```

## 为什么不要提交明文文件

当前 repository 是 public。任何提交到 public repo 的明文姓名和备注都会被公开、缓存、fork，也很难彻底删除。

如果一定要通过 git 下载文件，有两个安全选择：

1. 单独创建一个 private repository 存放导出文件。
2. 在 public repository 里只提交加密后的文件，例如 `exports/latest.json.age`，私钥只保存在你自己的电脑上。

第二种方式下，文件本身公开，但内容不可读；文件大小、更新时间等元数据仍然公开。因此更推荐 private repository。

## owner-export Edge Function

新增一个 `owner-export` Edge Function，只允许带有组织者 secret 的请求访问：

```text
OWNER_EXPORT_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

请求需要带：

```text
x-owner-export-secret: <OWNER_EXPORT_SECRET>
```

函数返回 HTML 表格或 CSV：

```bash
curl -H "x-owner-export-secret: $OWNER_EXPORT_SECRET" \
  "https://xzkdkxgqttonaxtkwlnj.functions.supabase.co/owner-export"

curl -H "x-owner-export-secret: $OWNER_EXPORT_SECRET" \
  "https://xzkdkxgqttonaxtkwlnj.functions.supabase.co/owner-export?format=csv"
```

不要返回 `participant_token_hash`，除非确实需要审计。

## 备注字段

如果需要收集备注，可以给 `participants` 增加：

```sql
alter table public.participants
add column if not exists remark text
check (remark is null or char_length(remark) <= 200);
```

前端提交备注时仍走 `submit-availability`，由 Edge Function 验证长度后写入。公开统计页不读取备注。

## GitHub Actions 导出

在 private repository 中创建手动 workflow：

1. 调用 Supabase `owner-export`。
2. 用 `age` 或 `gpg` 加密输出。
3. commit 加密文件。

GitHub Secrets：

```text
OWNER_EXPORT_SECRET
OWNER_EXPORT_URL
AGE_PUBLIC_KEY
```

私钥不要放进 GitHub，只保存在你的电脑上。

下载后本地解密：

```bash
age -d -i ~/.config/age/keys.txt exports/latest.json.age > latest.json
```

## 与按姓名搜索的冲突

当前应用有“按姓名搜索并加载提交”的公开功能。它不暴露 token hash，但任何知道姓名的人都可能加载该姓名最近一次提交。

如果严格要求“姓名和备注只有组织者能看到”，应删除公开按姓名搜索，只保留 localStorage participant token 恢复自己的提交。
