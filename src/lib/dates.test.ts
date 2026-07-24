import { describe, expect, it } from "vitest";
import {
  buildAllSlots,
  buildDateRange,
  buildWeeks,
  EVENT_END_DATE,
  EVENT_START_DATE,
} from "./dates";

describe("固定日期范围", () => {
  it("正确生成 2026-07-27 到 2026-08-30 范围内所有周五、周六、周日日期", () => {
    const days = buildDateRange();

    expect(EVENT_START_DATE).toBe("2026-07-27");
    expect(days[0]?.date).toBe("2026-07-31");
    expect(days.at(-1)?.date).toBe(EVENT_END_DATE);
    expect(days.every((day) => ["星期五", "星期六", "星期日"].includes(day.weekdayName))).toBe(
      true,
    );
  });

  it("总共生成 15 天", () => {
    expect(buildDateRange()).toHaveLength(15);
  });

  it("正确拆分为五个完整自然周，每周只展示星期五到星期日", () => {
    const weeks = buildWeeks();

    expect(weeks).toHaveLength(5);
    for (const week of weeks) {
      expect(week.days).toHaveLength(3);
      expect(week.days[0]?.weekdayName).toBe("星期五");
      expect(week.days[2]?.weekdayName).toBe("星期日");
    }

    expect(weeks[0]?.title).toBe("第一周｜7月27日—8月2日");
    expect(weeks[4]?.title).toBe("第五周｜8月24日—8月30日");
  });

  it("每个日期只生成午餐和晚餐两个时段", () => {
    const slots = buildAllSlots();

    expect(slots).toHaveLength(30);
    expect(slots.filter((slot) => slot.date === "2026-07-31")).toEqual([
      { date: "2026-07-31", meal: "lunch" },
      { date: "2026-07-31", meal: "dinner" },
    ]);
  });

  it("星期几显示正确，周末识别正确", () => {
    const days = buildDateRange();
    const friday = days.find((day) => day.date === "2026-07-31");
    const saturday = days.find((day) => day.date === "2026-08-01");
    const sunday = days.find((day) => day.date === "2026-08-30");

    expect(friday?.weekdayName).toBe("星期五");
    expect(friday?.isWeekend).toBe(false);
    expect(saturday?.weekdayName).toBe("星期六");
    expect(saturday?.isWeekend).toBe(true);
    expect(sunday?.weekdayName).toBe("星期日");
    expect(sunday?.isWeekend).toBe(true);
  });
});
