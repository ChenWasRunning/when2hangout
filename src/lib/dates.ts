import type { DayInfo, Meal, SelectedSlot, WeekInfo } from "../types";

export const EVENT_TITLE = "聚会时间统计";
export const EVENT_START_DATE = "2026-07-27";
export const EVENT_END_DATE = "2026-08-30";
export const MEALS: Meal[] = ["lunch", "dinner"];
const VISIBLE_WEEKDAY_INDEXES = new Set([5, 6, 0]);

export const MEAL_LABEL: Record<Meal, string> = {
  lunch: "午餐",
  dinner: "晚餐",
};

export const WEEKDAY_NAMES = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

export const WEEKDAY_SHORT_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export function parseLocalDate(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`非法日期：${date}`);
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function buildDateRange(
  startDate = EVENT_START_DATE,
  endDate = EVENT_END_DATE,
): DayInfo[] {
  return buildCalendarDateRange(startDate, endDate).filter((day) =>
    VISIBLE_WEEKDAY_INDEXES.has(day.weekdayIndex),
  );
}

function buildCalendarDateRange(startDate = EVENT_START_DATE, endDate = EVENT_END_DATE): DayInfo[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const days: DayInfo[] = [];

  for (let cursor = start; cursor <= end; cursor = addLocalDays(cursor, 1)) {
    const weekdayIndex = cursor.getDay();
    const month = cursor.getMonth() + 1;
    const day = cursor.getDate();

    days.push({
      date: toDateKey(cursor),
      month,
      day,
      weekdayIndex,
      weekdayName: WEEKDAY_NAMES[weekdayIndex],
      shortLabel: `${month}/${day}`,
      isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    });
  }

  return days;
}

export function buildWeeks(days = buildCalendarDateRange()): WeekInfo[] {
  if (days.length % 7 !== 0) {
    throw new Error("固定日期范围必须能拆分为完整自然周。");
  }

  const weeks: WeekInfo[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7);
    const weekNumber = index / 7 + 1;
    const first = weekDays[0];
    const last = weekDays[6];

    if (first.weekdayIndex !== 1 || last.weekdayIndex !== 0) {
      throw new Error("每周必须从星期一开始，到星期日结束。");
    }

    weeks.push({
      index: weekNumber,
      title: `第${toChineseNumber(weekNumber)}周｜${first.month}月${first.day}日—${last.month}月${last.day}日`,
      days: weekDays.filter((day) => VISIBLE_WEEKDAY_INDEXES.has(day.weekdayIndex)),
    });
  }

  return weeks;
}

export function buildAllSlots(days = buildDateRange()): SelectedSlot[] {
  return days.flatMap((day) => MEALS.map((meal) => ({ date: day.date, meal })));
}

export function isValidDateKey(date: string): boolean {
  return buildDateRange().some((day) => day.date === date);
}

export function isValidMeal(meal: string): meal is Meal {
  return meal === "lunch" || meal === "dinner";
}

export function slotKey(slot: SelectedSlot): string {
  return `${slot.date}:${slot.meal}`;
}

export function parseSlotKey(key: string): SelectedSlot | null {
  const [date, meal] = key.split(":");
  if (!date || !isValidDateKey(date) || !isValidMeal(meal)) {
    return null;
  }

  return { date, meal };
}

export function formatDateWithWeekday(date: string): string {
  const day = buildDateRange().find((item) => item.date === date);
  if (!day) {
    throw new Error(`非法日期：${date}`);
  }

  return `${day.month}月${day.day}日 ${day.weekdayName}`;
}

function toChineseNumber(value: number): string {
  const map = ["零", "一", "二", "三", "四", "五"];
  return map[value] ?? String(value);
}
