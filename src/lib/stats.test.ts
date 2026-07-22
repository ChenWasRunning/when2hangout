import { describe, expect, it } from "vitest";
import { sortBestSlots } from "./stats";
import type { StatsSlot } from "../types";

describe("统计排序", () => {
  it("按照人数、日期、午餐优先排序", () => {
    const slots: StatsSlot[] = [
      { date: "2026-08-01", meal: "dinner", availableCount: 2, participantNames: [] },
      { date: "2026-07-27", meal: "dinner", availableCount: 4, participantNames: [] },
      { date: "2026-07-27", meal: "lunch", availableCount: 4, participantNames: [] },
      { date: "2026-07-28", meal: "lunch", availableCount: 4, participantNames: [] },
      { date: "2026-07-29", meal: "lunch", availableCount: 1, participantNames: [] },
    ];

    expect(sortBestSlots(slots).map((slot) => `${slot.date}:${slot.meal}`)).toEqual([
      "2026-07-27:lunch",
      "2026-07-27:dinner",
      "2026-07-28:lunch",
      "2026-08-01:dinner",
      "2026-07-29:lunch",
    ]);
  });
});
