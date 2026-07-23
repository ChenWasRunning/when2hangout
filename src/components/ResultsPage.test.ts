import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { availabilityBackgroundColor, calculateDailyRatio } from "../lib/resultsColor";
import { ResultsPage } from "./ResultsPage";

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

  it("0人提交时仍显示矩阵，且所有日期为浅红色", async () => {
    render(
      createElement(ResultsPage, {
        api: {
          getMySubmission: async () => null,
          findSubmissionByName: async () => null,
          submitAvailability: async () => undefined,
          clearSubmission: async () => undefined,
          getStats: async () => ({ totalSubmissions: 0, slots: [] }),
        },
        onBack: () => undefined,
      }),
    );

    expect(await screen.findByText("暂无提交记录")).toBeInTheDocument();
    const firstDayCell = screen.getByLabelText("7/27 星期一，午餐 0/0，晚餐 0/0");
    expect(firstDayCell).toHaveStyle({ backgroundColor: availabilityBackgroundColor(0) });
    expect(screen.getByLabelText("每日可用人数矩阵")).toBeInTheDocument();
  });
});
