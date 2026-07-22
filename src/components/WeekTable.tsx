import { MEALS, WEEKDAY_SHORT_NAMES } from "../lib/dates";
import { slotKey } from "../lib/dates";
import type { Meal, WeekInfo } from "../types";
import { SlotButton } from "./SlotButton";

type WeekTableProps = {
  week: WeekInfo;
  selectedKeys: Set<string>;
  onToggle: (date: string, meal: Meal) => void;
};

export function WeekTable({ week, selectedKeys, onToggle }: WeekTableProps) {
  return (
    <section
      aria-labelledby={`week-${week.index}`}
      className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 id={`week-${week.index}`} className="text-lg font-bold text-stone-950">
        {week.title}
      </h2>

      <div className="mt-4 overflow-x-auto md:hidden">
        <div className="grid min-w-[430px] grid-cols-7 gap-2 pb-1">
          {week.days.map((day) => (
            <div
              key={day.date}
              className={[
                "rounded-lg border p-2",
                day.isWeekend ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-stone-50",
              ].join(" ")}
            >
              <div className="mb-2 min-h-12 text-center">
                <div className="text-xs font-bold text-stone-600">
                  {WEEKDAY_SHORT_NAMES[day.weekdayIndex]}
                </div>
                <div className="text-sm font-black text-stone-950">
                  {day.month}/{day.day}
                </div>
                {day.isWeekend ? (
                  <div className="text-[11px] font-semibold text-amber-800">周末</div>
                ) : null}
              </div>
              <div className="grid gap-2">
                {MEALS.map((meal) => (
                  <SlotButton
                    key={meal}
                    date={day.date}
                    meal={meal}
                    selected={selectedKeys.has(slotKey({ date: day.date, meal }))}
                    onToggle={onToggle}
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
                  {day.isWeekend ? <span className="block text-xs">周末</span> : null}
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
                      selected={selectedKeys.has(slotKey({ date: day.date, meal }))}
                      onToggle={onToggle}
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
