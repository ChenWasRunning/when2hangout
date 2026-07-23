import { describe, expect, it } from "vitest";
import { availabilityBackgroundColor, calculateDailyRatio } from "../lib/resultsColor";

describe("ResultsPage 统计配色", () => {
  it("按午餐和晚餐总可用人数计算每日比例", () => {
    expect(calculateDailyRatio(0, 0, 4)).toBe(0);
    expect(calculateDailyRatio(2, 2, 4)).toBe(0.5);
    expect(calculateDailyRatio(4, 4, 4)).toBe(1);
  });

  it("将归一化比例映射为浅色红到绿", () => {
    expect(availabilityBackgroundColor(0)).toBe("hsl(0 70% 91%)");
    expect(availabilityBackgroundColor(0.5)).toBe("hsl(60 70% 91%)");
    expect(availabilityBackgroundColor(1)).toBe("hsl(120 70% 91%)");
  });
});
