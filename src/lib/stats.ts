import { compareSlots } from "./selection";
import type { StatsSlot } from "../types";

export function sortBestSlots(slots: StatsSlot[]): StatsSlot[] {
  return [...slots].sort((a, b) => {
    if (b.availableCount !== a.availableCount) {
      return b.availableCount - a.availableCount;
    }
    return compareSlots(a, b);
  });
}
