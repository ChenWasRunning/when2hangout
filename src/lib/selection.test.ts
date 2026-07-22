import { describe, expect, it } from "vitest";
import { keysToSlots, setSlotsSelected, slotsToKeys, toggleSlot, validateSlots } from "./selection";

describe("选择逻辑", () => {
  it("单元格选择和取消选择正确", () => {
    const slot = { date: "2026-07-27", meal: "lunch" as const };
    const selected = toggleSlot(new Set(), slot);
    expect(selected.has("2026-07-27:lunch")).toBe(true);

    const unselected = toggleSlot(selected, slot);
    expect(unselected.has("2026-07-27:lunch")).toBe(false);
  });

  it("提交 payload 中没有重复记录", () => {
    const slots = validateSlots([
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-07-27", meal: "dinner" },
    ]);

    expect(slots).toEqual([
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-07-27", meal: "dinner" },
    ]);
  });

  it("key 与 slot 可以互相转换", () => {
    const keys = slotsToKeys([
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-08-30", meal: "dinner" },
    ]);

    expect(keysToSlots(keys)).toEqual([
      { date: "2026-07-27", meal: "lunch" },
      { date: "2026-08-30", meal: "dinner" },
    ]);
  });

  it("可以批量选中和取消一段 slots", () => {
    const slots = [
      { date: "2026-07-30", meal: "lunch" as const },
      { date: "2026-07-30", meal: "dinner" as const },
      { date: "2026-07-31", meal: "lunch" as const },
    ];

    const selected = setSlotsSelected(new Set(), slots, true);
    expect(selected).toEqual(
      new Set(["2026-07-30:lunch", "2026-07-30:dinner", "2026-07-31:lunch"]),
    );

    const removed = setSlotsSelected(selected, [{ date: "2026-07-30", meal: "lunch" }], false);
    expect(removed).toEqual(new Set(["2026-07-30:dinner", "2026-07-31:lunch"]));
  });

  it("非法日期和非法 meal 值会被拒绝", () => {
    expect(() => validateSlots([{ date: "2026-07-26", meal: "lunch" }])).toThrow("非法日期");
    expect(() =>
      validateSlots([{ date: "2026-07-27", meal: "breakfast" as "lunch" }]),
    ).toThrow("非法 meal 值");
  });
});
