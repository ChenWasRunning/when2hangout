import { MEALS, WEEKDAY_SHORT_NAMES } from "../lib/dates";
import { slotKey } from "../lib/dates";
import type { Meal, SelectedSlot, WeekInfo } from "../types";
import { SlotButton } from "./SlotButton";

type WeekTableProps = {
  week: WeekInfo;
  selectedKeys: Set<string>;
  locked: boolean;
  onToggle: (date: string, meal: Meal) => void;
  onPaintStart: (date: string, meal: Meal, selected: boolean) => void;
  onPaintEnter: (date: string, meal: Meal) => void;
  onToggleLock: (weekIndex: number) => void;
  onClearWeek: (slots: SelectedSlot[]) => void;
};

export function WeekTable({
  week,
  selectedKeys,
  locked,
  onToggle,
  onPaintStart,
  onPaintEnter,
  onToggleLock,
  onClearWeek,
}: WeekTableProps) {
  const weekSlots = week.days.flatMap((day) => MEALS.map((meal) => ({ date: day.date, meal })));

  return (
    <section
      aria-labelledby={`week-${week.index}`}
      className="rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`week-${week.index}`} className="min-w-0 flex-1 text-lg font-bold text-stone-950">
          {week.title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={locked ? `解锁第${week.index}周` : `锁定第${week.index}周`}
            aria-pressed={locked}
            onClick={() => onToggleLock(week.index)}
            className={[
              "min-h-9 rounded-md border px-2 text-sm font-bold sm:px-3",
              locked
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-stone-300 bg-white text-stone-700",
            ].join(" ")}
          >
            <span aria-hidden="true">{locked ? "🔒" : "🔓"}</span>
            <span className="ml-1">{locked ? "已锁" : "锁定"}</span>
          </button>
          <button
            type="button"
            aria-label={`清空第${week.index}周`}
            onClick={() => onClearWeek(weekSlots)}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700"
          >
            清空
          </button>
        </div>
      </div>

      <div className="mt-3 md:hidden">
        <div className="grid w-full grid-cols-7 gap-0.5">
          {week.days.map((day) => (
            <div
              key={day.date}
              className={[
                "min-w-0 rounded-md border p-1",
                day.isWeekend ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-stone-50",
              ].join(" ")}
            >
              <div className="mb-1 min-h-11 text-center">
                <div className="text-[11px] font-bold leading-4 text-stone-600">
                  {WEEKDAY_SHORT_NAMES[day.weekdayIndex]}
                </div>
                <div className="text-sm font-black leading-5 text-stone-950">
                  {day.month}/{day.day}
                </div>
              </div>
              <div className="grid gap-1">
                {MEALS.map((meal) => (
                  <SlotButton
                    key={meal}
                    date={day.date}
                    meal={meal}
                    locked={locked}
                    selected={selectedKeys.has(slotKey({ date: day.date, meal }))}
                    onToggle={onToggle}
                    onPaintStart={onPaintStart}
                    onPaintEnter={onPaintEnter}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] border-separate border-spacing-2">
          <caption className="sr-only">{week.title} 的午餐和晚餐可选时间</caption>
          <thead>
            <tr>
              <th scope="col" className="w-24 rounded-md bg-stone-100 px-3 py-3 text-left text-sm">
                时段
              </th>
              {week.days.map((day) => (
                <th
                  key={day.date}
                  scope="col"
                  className={[
                    "rounded-md border px-3 py-3 text-sm",
                    day.isWeekend
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-stone-200 bg-stone-50 text-stone-900",
                  ].join(" ")}
                >
                  <span className="block">{day.weekdayName}</span>
                  <span className="block text-base font-black">{day.month}/{day.day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => (
              <tr key={meal}>
                <th
                  scope="row"
                  className="rounded-md bg-stone-100 px-3 py-3 text-left text-sm font-bold"
                >
                  {meal === "lunch" ? "午餐" : "晚餐"}
                </th>
                {week.days.map((day) => (
                  <td key={`${day.date}:${meal}`} className="p-0">
                    <SlotButton
                      date={day.date}
                      meal={meal}
                      locked={locked}
                      selected={selectedKeys.has(slotKey({ date: day.date, meal }))}
                      onToggle={onToggle}
                      onPaintStart={onPaintStart}
                      onPaintEnter={onPaintEnter}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
