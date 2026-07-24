export type Meal = "lunch" | "dinner";
export type ParticipationStatus = "available" | "unavailable";

export type SelectedSlot = {
  date: string;
  meal: Meal;
};

const startDate = "2026-07-27";
const endDate = "2026-08-30";
const validMeals = new Set(["lunch", "dinner"]);
const validWeekdayIndexes = new Set([5, 6, 0]);

export function normalizeName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("请输入你的名字");
  }

  const name = value.trim();
  if (!name) {
    throw new Error("请输入你的名字");
  }

  if (name.length > 30) {
    throw new Error("名字不能超过30个字符");
  }

  return name;
}

export function validateParticipantToken(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("participant token 失效");
  }

  return value;
}

export function validateSlots(value: unknown): SelectedSlot[] {
  if (!Array.isArray(value)) {
    throw new Error("选择数据格式不正确");
  }

  const unique = new Map<string, SelectedSlot>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new Error("选择数据格式不正确");
    }

    const date = (item as Record<string, unknown>).date;
    const meal = (item as Record<string, unknown>).meal;

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("非法日期");
    }

    if (date < startDate || date > endDate) {
      throw new Error("非法日期");
    }

    if (!validWeekdayIndexes.has(getWeekdayIndex(date))) {
      throw new Error("非法日期");
    }

    if (typeof meal !== "string" || !validMeals.has(meal)) {
      throw new Error("非法 meal 值");
    }

    unique.set(`${date}:${meal}`, { date, meal: meal as Meal });
  }

  return Array.from(unique.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.meal === b.meal) return 0;
    return a.meal === "lunch" ? -1 : 1;
  });
}

export function validateParticipationStatus(value: unknown): ParticipationStatus {
  if (value === undefined || value === null) {
    return "available";
  }

  if (value !== "available" && value !== "unavailable") {
    throw new Error("参与状态不正确");
  }

  return value;
}

function getWeekdayIndex(date: string): number {
  const [yearValue, monthValue, dayValue] = date.split("-").map(Number);
  const monthOffset = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let year = yearValue;
  const month = monthValue;
  if (month < 3) {
    year -= 1;
  }

  return (
    (year +
      Math.floor(year / 4) -
      Math.floor(year / 100) +
      Math.floor(year / 400) +
      monthOffset[month - 1] +
      dayValue) %
    7
  );
}

export async function hashParticipantToken(token: string): Promise<string> {
  const pepper = Deno.env.get("PARTICIPANT_TOKEN_PEPPER");
  if (!pepper) {
    throw new Error("服务端 token 配置缺失");
  }

  const input = new TextEncoder().encode(`${pepper}:${token}`);
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
