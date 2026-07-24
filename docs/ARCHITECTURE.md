# 架构说明

## 总体结构

应用是一个静态 React SPA，部署到 GitHub Pages。浏览器不直接写数据库表，而是调用 Supabase Edge Functions。

```text
微信浏览器
  -> GitHub Pages 静态资源
  -> Supabase Edge Functions
  -> Supabase Postgres RPC
```

## 前端结构

- `src/App.tsx`：主填写页、提交状态、恢复旧提交、路由切换。
- `src/components/NameLookupPanel.tsx`：顶部姓名输入与按姓名搜索。
- `src/components/WeekTable.tsx`：五周时间选择表。
- `src/components/SubmitPanel.tsx`：底部备注与提交区。
- `src/components/ResultsPage.tsx`：统计结果页。
- `src/lib/dates.ts`：固定日期、五周拆分、星期和时段生成。
- `src/lib/selection.ts`：slot key、选择切换、payload 去重和校验。
- `src/lib/api.ts`：Supabase Edge Functions API 边界。

## 固定活动配置

第一版没有 events 表，也不允许用户创建活动。活动固定写在 `src/lib/dates.ts`：

```ts
EVENT_START_DATE = "2026-07-27";
EVENT_END_DATE = "2026-08-30";
```

逻辑中始终使用 `YYYY-MM-DD` 字符串，不把日期转换为 UTC timestamp。

页面按五个自然周分组，但每周只展示星期五、星期六、星期日。前端、Edge Function 校验和数据库 RPC 都只接受这些可见日期。

## 数据保存流程

1. 用户点击单元格，只更新 React state。
2. 用户输入名字。
3. 用户点击“提交时间”或“更新提交”。
4. 前端验证姓名和 slots。
5. 前端按当前姓名读取 localStorage participant token；没有该姓名的 token 时生成新 token。
6. 前端调用 `submit-availability` Edge Function。
7. Edge Function 验证 token、姓名、参与状态和 slots。
8. Edge Function 哈希 token。
9. Edge Function 调用 `submit_availability` RPC。
10. RPC 优先按 token 更新；如果 token 不匹配但名字已存在，则更新同名最近一条记录，并绑定当前设备 token。
11. RPC 在一次数据库函数调用内更新参与状态并替换该参与者完整 availability。

五周表格之后的独立“本次无法参与”会把前端状态设为 `unavailable` 并清空 slots。用户之后再点任意午餐/晚餐格或全选某周，会自动恢复为 `available`。

顶部姓名搜索调用 `submission-by-name` Edge Function。它用于加载同名最近一次提交到当前页面；搜索成功后底部按钮显示“更新提交”。保存仍然必须由用户点击底部提交按钮触发。

顶部“清空记录”调用 `clear-submission` Edge Function。前端必须提供当前姓名在本浏览器 localStorage 中保存的 participant token；后台只删除 token hash 和显示姓名同时匹配的记录，availability 通过外键级联删除。

## 统计流程

统计页调用 `stats` Edge Function。Edge Function 调用 `get_public_stats` RPC，只返回每个固定 slot 的人数和总提交人数。前端只渲染聚合结果，不直接下载数据库表，也不公开参与者姓名。

## 私有导出与邮件

数据库 migration 创建 `owner_availability_matrix` view，把每个参与者展开为：

```text
名字 | 提交时间 | 状态 | 7.31 午 | 7.31 晚 | 8.1 午 | ...
```

“状态”列显示“可参与”或“本次无法参与”。`owner-export` Edge Function 用 `OWNER_EXPORT_SECRET` 保护，返回按提交时间升序排列的 HTML 或 CSV。`submit-availability` 和 `clear-submission` 成功后会调用共享的 owner export helper；如果配置了 `RESEND_API_KEY`，后端会把最新 HTML 表格和 CSV 附件发送到 `OWNER_EMAIL`。
