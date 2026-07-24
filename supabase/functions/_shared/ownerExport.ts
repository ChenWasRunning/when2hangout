type OwnerExportRow = Record<string, string | number | null>;
type Meal = "lunch" | "dinner";
type SelectedSlot = {
  date: string;
  meal: Meal;
};

type DatabaseClient = {
  from: (table: string) => any;
};

type EmailSummary = {
  title: string;
  lines: string[];
};

const exportColumns = [
  "名字",
  "提交时间",
  "7.31 午",
  "7.31 晚",
  "8.1 午",
  "8.1 晚",
  "8.2 午",
  "8.2 晚",
  "8.7 午",
  "8.7 晚",
  "8.8 午",
  "8.8 晚",
  "8.9 午",
  "8.9 晚",
  "8.14 午",
  "8.14 晚",
  "8.15 午",
  "8.15 晚",
  "8.16 午",
  "8.16 晚",
  "8.21 午",
  "8.21 晚",
  "8.22 午",
  "8.22 晚",
  "8.23 午",
  "8.23 晚",
  "8.28 午",
  "8.28 晚",
  "8.29 午",
  "8.29 晚",
  "8.30 午",
  "8.30 晚",
];

export async function fetchOwnerExportRows(supabase: {
  from: (table: string) => {
    select: (columns: string) => Promise<{ data: OwnerExportRow[] | null; error: unknown }>;
  };
}): Promise<OwnerExportRow[]> {
  const { data, error } = await supabase.from("owner_availability_matrix").select("*");
  if (error) {
    throw error;
  }

  return sortOwnerExportRows(data ?? []);
}

export function renderOwnerExportHtml(rows: OwnerExportRow[], title = "聚会时间填写列表"): string {
  const header = exportColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body =
    rows.length > 0
      ? rows
          .map(
            (row) =>
              `<tr>${exportColumns
                .map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`)
                .join("")}</tr>`,
          )
          .join("")
      : `<tr><td colspan="${exportColumns.length}">暂无提交记录</td></tr>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #1c1917; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { margin: 0 0 16px; color: #57534e; }
    .summary { border: 1px solid #99f6e4; background: #f0fdfa; border-radius: 8px; padding: 12px 14px; margin: 0 0 16px; }
    .summary h2 { font-size: 16px; margin: 0 0 8px; }
    .summary ul { margin: 0; padding-left: 20px; }
    .summary li { margin: 4px 0; }
    .table-wrap { overflow-x: auto; border: 1px solid #e7e5e4; border-radius: 8px; }
    table { border-collapse: collapse; min-width: 1280px; width: 100%; }
    th, td { border-bottom: 1px solid #e7e5e4; padding: 8px 10px; text-align: center; white-space: nowrap; }
    th { background: #fef3c7; font-weight: 800; position: sticky; top: 0; }
    td:first-child, th:first-child { text-align: left; position: sticky; left: 0; background: #fff7ed; }
    tr:last-child td { border-bottom: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>生成时间：${escapeHtml(formatNow())}，共 ${rows.length} 人。</p>
  <div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>
</body>
</html>`;
}

export function renderOwnerExportEmailHtml(
  rows: OwnerExportRow[],
  title: string,
  summary: EmailSummary,
): string {
  const summaryItems = summary.lines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const summaryHtml = `<section class="summary"><h2>${escapeHtml(summary.title)}</h2><ul>${summaryItems}</ul></section>`;

  return renderOwnerExportHtml(rows, title).replace(
    '<div class="table-wrap">',
    `${summaryHtml}<div class="table-wrap">`,
  );
}

export function renderOwnerExportCsv(rows: OwnerExportRow[]): string {
  const lines = [exportColumns.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(exportColumns.map((column) => escapeCsv(String(row[column] ?? ""))).join(","));
  }
  return lines.join("\n");
}

export async function sendOwnerExportEmail(
  supabase: Parameters<typeof fetchOwnerExportRows>[0],
  action: string,
  summary: EmailSummary = {
    title: "提交更新",
    lines: ["有人提交或更新了时间。"],
  },
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return;
  }

  const ownerEmail = Deno.env.get("OWNER_EMAIL") ?? "r.chen9792@gmail.com";
  const from = Deno.env.get("OWNER_EMAIL_FROM") ?? "When2Hangout <onboarding@resend.dev>";
  const rows = await fetchOwnerExportRows(supabase);
  const csv = renderOwnerExportCsv(rows);
  const html = renderOwnerExportEmailHtml(rows, `聚会时间填写列表｜${action}`, summary);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ownerEmail],
      subject: `聚会时间填写更新｜${summary.title}｜${rows.length}人`,
      html,
      attachments: [
        {
          filename: "when2hangout-availability.csv",
          content: encodeBase64(csv),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`owner export email failed: ${response.status} ${await response.text()}`);
  }
}

export async function fetchSubmissionSnapshot(
  supabase: DatabaseClient,
  options: { tokenHash: string; displayName: string },
): Promise<{ displayName: string; slots: SelectedSlot[] } | null> {
  const tokenResult = await supabase
    .from("participants")
    .select("id, display_name")
    .eq("participant_token_hash", options.tokenHash)
    .maybeSingle();

  if (tokenResult?.error) {
    throw tokenResult.error;
  }

  const participant = tokenResult?.data ?? (await fetchLatestParticipantByName(supabase, options.displayName));
  if (!participant) {
    return null;
  }

  const slots = await fetchAvailabilitySlots(supabase, participant.id);
  return {
    displayName: participant.display_name,
    slots,
  };
}

export function buildSubmissionEmailSummary(
  displayName: string,
  beforeSlots: SelectedSlot[] | null,
  afterSlots: SelectedSlot[],
): EmailSummary {
  if (!beforeSlots) {
    return {
      title: `${displayName} 新增了日期填写`,
      lines: [
        `${displayName} 新增了日期填写。`,
        `已选择：${formatSlotList(afterSlots)}`,
      ],
    };
  }

  const addedSlots = diffSlots(afterSlots, beforeSlots);
  const removedSlots = diffSlots(beforeSlots, afterSlots);
  const lines = [`${displayName} 修改了日期填写。`];

  if (addedSlots.length > 0) {
    lines.push(`新增：${formatSlotList(addedSlots)}`);
  }

  if (removedSlots.length > 0) {
    lines.push(`取消：${formatSlotList(removedSlots)}`);
  }

  if (addedSlots.length === 0 && removedSlots.length === 0) {
    lines.push("选择内容没有变化。");
  }

  return {
    title: `${displayName} 修改了日期填写`,
    lines,
  };
}

export function buildClearEmailSummary(displayName: string): EmailSummary {
  return {
    title: `${displayName} 清空了日期填写`,
    lines: [`${displayName} 清空了日期填写。`],
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatNow(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function fetchLatestParticipantByName(
  supabase: DatabaseClient,
  displayName: string,
): Promise<{ id: string; display_name: string } | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name")
    .eq("display_name", displayName)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchAvailabilitySlots(
  supabase: DatabaseClient,
  participantId: string,
): Promise<SelectedSlot[]> {
  const { data, error } = await supabase
    .from("availability")
    .select("date, meal")
    .eq("participant_id", participantId);

  if (error) {
    throw error;
  }

  return (data ?? []).sort(compareSlots);
}

function diffSlots(leftSlots: SelectedSlot[], rightSlots: SelectedSlot[]): SelectedSlot[] {
  const rightKeys = new Set(rightSlots.map(slotKey));
  return leftSlots.filter((slot) => !rightKeys.has(slotKey(slot))).sort(compareSlots);
}

function formatSlotList(slots: SelectedSlot[]): string {
  if (slots.length === 0) {
    return "无";
  }

  return slots.map(formatSlot).join("，");
}

function formatSlot(slot: SelectedSlot): string {
  const [, month, day] = slot.date.split("-");
  return `${Number(month)}.${Number(day)} ${slot.meal === "lunch" ? "午" : "晚"}`;
}

function slotKey(slot: SelectedSlot): string {
  return `${slot.date}:${slot.meal}`;
}

function compareSlots(a: SelectedSlot, b: SelectedSlot): number {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }

  if (a.meal === b.meal) {
    return 0;
  }

  return a.meal === "lunch" ? -1 : 1;
}

function sortOwnerExportRows(rows: OwnerExportRow[]): OwnerExportRow[] {
  return [...rows].sort((a, b) => {
    const timeDiff = parseSubmitTime(a["提交时间"]) - parseSubmitTime(b["提交时间"]);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return String(a["名字"] ?? "").localeCompare(String(b["名字"] ?? ""), "zh-Hans-CN");
  });
}

function parseSubmitTime(value: unknown): number {
  const match = /^(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})$/.exec(String(value ?? ""));
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, month, day, hour, minute] = match;
  return (
    Number(month) * 31 * 24 * 60 +
    Number(day) * 24 * 60 +
    Number(hour) * 60 +
    Number(minute)
  );
}
