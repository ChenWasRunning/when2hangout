import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  buildSubmissionEmailSummary,
  fetchSubmissionSnapshot,
  sendOwnerExportEmail,
} from "../_shared/ownerExport.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  hashParticipantToken,
  normalizeName,
  validateParticipantToken,
  validateSlots,
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
    const slots = validateSlots(body.slots);
    const participantTokenHash = await hashParticipantToken(participantToken);

    const supabase = createAdminClient();
    const previousSubmission = await fetchSubmissionSnapshot(supabase, {
      tokenHash: participantTokenHash,
      displayName,
    });
    const { error } = await supabase.rpc("submit_availability", {
      p_token_hash: participantTokenHash,
      p_display_name: displayName,
      p_slots: slots.map((slot) => ({
        slot_date: slot.date,
        slot_meal: slot.meal,
      })),
    });

    if (error) {
      console.error(error);
      return jsonResponse({ error: "提交失败，请重试" }, 500);
    }

    const summary = buildSubmissionEmailSummary(displayName, previousSubmission?.slots ?? null, slots);
    await sendOwnerExportEmail(supabase, "提交或更新", summary).catch((emailError) => {
      console.error(emailError);
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败，请重试";
    const status = message.includes("缺失") ? 500 : 400;
    return jsonResponse({ error: message }, status);
  }
});
