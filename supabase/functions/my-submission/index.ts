import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { hashParticipantToken, validateParticipantToken } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "POST") {
    return jsonResponse({ error: "请求方法不正确" }, 405);
  }

  try {
    const body = await request.json();
    const participantToken = validateParticipantToken(body.participantToken);
    const participantTokenHash = await hashParticipantToken(participantToken);
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_my_submission", {
      p_token_hash: participantTokenHash,
    });

    if (error) {
      console.error(error);
      return jsonResponse({ error: "读取提交记录失败" }, 500);
    }

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "participant token 失效";
    return jsonResponse({ error: message }, 400);
  }
});
