import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { buildClearEmailSummary, sendOwnerExportEmail } from "../_shared/ownerExport.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  hashParticipantToken,
  normalizeName,
  validateParticipantToken,
} from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "POST") {
    return jsonResponse({ error: "请求方法不正确" }, 405);
  }

  try {
    const body = await request.json();
    const participantToken = validateParticipantToken(body.participantToken);
    const displayName = normalizeName(body.displayName);
    const participantTokenHash = await hashParticipantToken(participantToken);

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("clear_submission", {
      p_token_hash: participantTokenHash,
      p_display_name: displayName,
    });

    if (error) {
      console.error(error);
      return jsonResponse({ error: "清空失败，请重试" }, 500);
    }

    if (!data) {
      return jsonResponse({ error: "没有找到可清空的提交记录" }, 404);
    }

    await sendOwnerExportEmail(supabase, "清空记录", buildClearEmailSummary(displayName)).catch((emailError) => {
      console.error(emailError);
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "清空失败，请重试";
    const status = message.includes("缺失") ? 500 : 400;
    return jsonResponse({ error: message }, status);
  }
});
