import { describe, expect, it } from "vitest";
import {
  buildAllSlots,
  buildDateRange,
  buildWeeks,
  EVENT_END_DATE,
  EVENT_START_DATE,
} from "./dates";

describe("固定日期范围", () => {
  it("正确生成从 2026-07-27 到 2026-08-30 的全部日期，并包含首尾日期", () => {
    const days = buildDateRange();

    expect(days[0]?.date).toBe(EVENT_START_DATE);
    expect(days.at(-1)?.date).toBe(EVENT_END_DATE);
  });

  it("总共生成 35 天", () => {
    expect(buildDateRange()).toHaveLength(35);
  });

  it("正确拆分为五个完整自然周，每周从星期一开始，到星期日结束", () => {
    const weeks = buildWeeks();

    expect(weeks).toHaveLength(5);
    for (const week of weeks) {
      expect(week.days).toHaveLength(7);
      expect(week.days[0]?.weekdayName).toBe("星期一");
      expect(week.days[6]?.weekdayName).toBe("星期日");
    }

    expect(weeks[0]?.title).toBe("第一周｜7月27日—8月2日");
    expect(weeks[4]?.title).toBe("第五周｜8月24日—8月30日");
  });

  it("每个日期只生成午餐和晚餐两个时段", () => {
    const slots = buildAllSlots();

    expect(slots).toHaveLength(70);
    expect(slots.filter((slot) => slot.date === "2026-07-27")).toEqual([
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-07-27", meal: "dinner" },
    ]);
  });

  it("星期几显示正确，周末识别正确", () => {
    const days = buildDateRange();
    const monday = days.find((day) => day.date === "2026-07-27");
    const saturday = days.find((day) => day.date === "2026-08-01");
    const sunday = days.find((day) => day.date === "2026-08-30");

    expect(monday?.weekdayName).toBe("星期一");
    expect(monday?.isWeekend).toBe(false);
    expect(saturday?.weekdayName).toBe("星期六");
    expect(saturday?.isWeekend).toBe(true);
    expect(sunday?.weekdayName).toBe("星期日");
    expect(sunday?.isWeekend).toBe(true);
  });
});
