import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { normalizeName } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "POST") {
    return jsonResponse({ error: "请求方法不正确" }, 405);
  }

  try {
    const body = await request.json();
    const displayName = normalizeName(body.displayName);
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_submission_by_name", {
      p_display_name: displayName,
    });

    if (error) {
      console.error(error);
      return jsonResponse({ error: "搜索失败，请重试" }, 500);
    }

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "搜索失败，请重试";
    return jsonResponse({ error: message }, 400);
  }
});
