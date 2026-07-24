import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  fetchOwnerExportRows,
  renderOwnerExportCsv,
  renderOwnerExportHtml,
} from "../_shared/ownerExport.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "GET") {
    return jsonResponse({ error: "请求方法不正确" }, 405);
  }

  const configuredSecret = Deno.env.get("OWNER_EXPORT_SECRET");
  const requestUrl = new URL(request.url);
  const providedSecret =
    request.headers.get("x-owner-export-secret") ?? requestUrl.searchParams.get("secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return jsonResponse({ error: "无权查看私有导出" }, 401);
  }

  try {
    const supabase = createAdminClient();
    const rows = await fetchOwnerExportRows(supabase);
    const format = requestUrl.searchParams.get("format") ?? "html";

    if (format === "csv") {
      return new Response(renderOwnerExportCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="when2hangout-availability.csv"',
        },
      });
    }

    return new Response(renderOwnerExportHtml(rows), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "私有导出生成失败" }, 500);
  }
});
