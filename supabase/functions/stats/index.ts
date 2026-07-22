import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "POST") {
    return jsonResponse({ error: "请求方法不正确" }, 405);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_public_stats");

    if (error) {
      console.error(error);
      return jsonResponse({ error: "统计数据加载失败" }, 500);
    }

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "统计数据加载失败";
    return jsonResponse({ error: message }, 500);
  }
});
