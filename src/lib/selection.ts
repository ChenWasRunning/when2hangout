import { buildAllSlots, isValidMeal, isValidDateKey, parseSlotKey, slotKey } from "./dates";
import type { SelectedSlot } from "../types";

export function toggleSlot(selectedKeys: Set<string>, slot: SelectedSlot): Set<string> {
  validateSlot(slot);
  const next = new Set(selectedKeys);
  const key = slotKey(slot);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  return next;
}

export function setSlotSelected(
  selectedKeys: Set<string>,
  slot: SelectedSlot,
  selected: boolean,
): Set<string> {
  validateSlot(slot);
  const next = new Set(selectedKeys);
  const key = slotKey(slot);

  if (selected) {
    next.add(key);
  } else {
    next.delete(key);
  }

  return next;
}

export function setSlotsSelected(
  selectedKeys: Set<string>,
  slots: SelectedSlot[],
  selected: boolean,
): Set<string> {
  const next = new Set(selectedKeys);
  for (const slot of validateSlots(slots)) {
    const key = slotKey(slot);
    if (selected) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return next;
}

export function slotsToKeys(slots: SelectedSlot[]): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    validateSlot(slot);
    keys.add(slotKey(slot));
  }
  return keys;
}

export function keysToSlots(keys: Set<string>): SelectedSlot[] {
  return Array.from(keys)
    .map((key) => parseSlotKey(key))
    .filter((slot): slot is SelectedSlot => slot !== null)
    .sort(compareSlots);
}

export function validateSlots(slots: SelectedSlot[]): SelectedSlot[] {
  const unique = new Map<string, SelectedSlot>();
  for (const slot of slots) {
    validateSlot(slot);
    unique.set(slotKey(slot), slot);
  }
  return Array.from(unique.values()).sort(compareSlots);
}

export function validateSlot(slot: SelectedSlot): void {
  if (!isValidDateKey(slot.date)) {
    throw new Error("非法日期");
  }

  if (!isValidMeal(slot.meal)) {
    throw new Error("非法 meal 值");
  }
}

export function compareSlots(a: SelectedSlot, b: SelectedSlot): number {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  if (a.meal === b.meal) {
    return 0;
  }
  return a.meal === "lunch" ? -1 : 1;
}

export function createEmptySlotCounts(): Record<string, number> {
  return Object.fromEntries(buildAllSlots().map((slot) => [slotKey(slot), 0]));
}
