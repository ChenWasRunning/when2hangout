import { MEAL_LABEL, slotKey } from "../lib/dates";
import type { Meal } from "../types";

type SlotButtonProps = {
  date: string;
  meal: Meal;
  selected: boolean;
  onToggle: (date: string, meal: Meal) => void;
  onPaintStart?: (date: string, meal: Meal, selected: boolean) => void;
  onPaintEnter?: (date: string, meal: Meal) => void;
};

export function SlotButton({
  date,
  meal,
  selected,
  onToggle,
  onPaintStart,
  onPaintEnter,
}: SlotButtonProps) {
  const label = MEAL_LABEL[meal];

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${date} ${label}${selected ? "，已选择，有空" : "，未选择"}`}
      data-testid={`slot-${slotKey({ date, meal })}`}
      data-slot-date={date}
      data-slot-meal={meal}
      onClick={(event) => {
        if (event.detail === 0) {
          onToggle(date, meal);
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        onPaintStart?.(date, meal, selected);
      }}
      onPointerEnter={() => onPaintEnter?.(date, meal)}
      className={[
        "min-h-12 w-full touch-none select-none rounded-md border px-2 py-2 text-sm font-semibold transition",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-200",
        selected
          ? "border-teal-700 bg-teal-700 text-white shadow-sm"
          : "border-stone-300 bg-white text-stone-800 active:bg-stone-100",
      ].join(" ")}
    >
      <span className="flex items-center justify-center gap-1">
        <span aria-hidden="true">{selected ? "✓" : "○"}</span>
        <span>{selected ? "有空" : label}</span>
      </span>
    </button>
  );
}
