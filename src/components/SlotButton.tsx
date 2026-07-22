import { MEAL_LABEL, slotKey } from "../lib/dates";
import type { Meal } from "../types";

type SlotButtonProps = {
  date: string;
  meal: Meal;
  selected: boolean;
  locked: boolean;
  onToggle: (date: string, meal: Meal) => void;
  onPaintStart?: (date: string, meal: Meal, selected: boolean) => void;
  onPaintEnter?: (date: string, meal: Meal) => void;
};

export function SlotButton({
  date,
  meal,
  selected,
  locked,
  onToggle,
  onPaintStart,
  onPaintEnter,
}: SlotButtonProps) {
  const label = MEAL_LABEL[meal];

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${date} ${label}${selected ? "，已选择，有空" : "，未选择"}${locked ? "，本周已锁定" : ""}`}
      data-testid={`slot-${slotKey({ date, meal })}`}
      data-slot-date={date}
      data-slot-meal={meal}
      data-slot-locked={locked ? "true" : "false"}
      onClick={(event) => {
        if (!locked && event.detail === 0) {
          onToggle(date, meal);
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        if (locked) {
          return;
        }
        onPaintStart?.(date, meal, selected);
      }}
      onPointerEnter={() => {
        if (!locked) {
          onPaintEnter?.(date, meal);
        }
      }}
      className={[
        "min-h-11 w-full touch-none select-none rounded-md border px-1 py-2 text-xs font-semibold transition sm:min-h-12 sm:px-2 sm:text-sm",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-200",
        locked ? "cursor-not-allowed" : "",
        selected
          ? "border-teal-700 bg-teal-700 text-white shadow-sm"
          : "border-stone-300 bg-white text-stone-800 active:bg-stone-100",
      ].join(" ")}
    >
      <span className="flex items-center justify-center gap-0.5 whitespace-nowrap sm:gap-1">
        <span aria-hidden="true">{selected ? "✓" : "○"}</span>
        <span>{selected ? "有空" : label}</span>
      </span>
    </button>
  );
}
