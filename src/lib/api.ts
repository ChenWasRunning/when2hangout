import { supabase } from "./supabase";
import { validateSlots } from "./selection";
import type { AppApi, MySubmission, StatsResponse, SubmitPayload } from "../types";

type FunctionResponse<T> = {
  data: T | null;
  error: Error | null;
};

export class MissingSupabaseConfigError extends Error {
  constructor() {
    super("Supabase 配置缺失，请检查环境变量。");
  }
}

async function invokeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!supabase) {
    throw new MissingSupabaseConfigError();
  }

  const { data, error } = (await supabase.functions.invoke(functionName, {
    body,
  })) as FunctionResponse<T>;

  if (error) {
    throw error;
  }

  return data as T;
}

export const supabaseApi: AppApi = {
  async getMySubmission(participantToken: string): Promise<MySubmission | null> {
    return invokeFunction<MySubmission | null>("my-submission", { participantToken });
  },

  async findSubmissionByName(displayName: string): Promise<MySubmission | null> {
    return invokeFunction<MySubmission | null>("submission-by-name", { displayName });
  },

  async submitAvailability(payload: SubmitPayload): Promise<void> {
    await invokeFunction("submit-availability", {
      participantToken: payload.participantToken,
      displayName: payload.displayName,
      slots: validateSlots(payload.slots),
    });
  },

  async getStats(): Promise<StatsResponse> {
    return invokeFunction<StatsResponse>("stats");
  },
};
