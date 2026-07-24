import { MEALS, WEEKDAY_SHORT_NAMES } from "../lib/dates";
import { slotKey } from "../lib/dates";
import type { Meal, ParticipationStatus, SelectedSlot, WeekInfo } from "../types";
import { SlotButton } from "./SlotButton";

type WeekTableProps = {
  week: WeekInfo;
  selectedKeys: Set<string>;
  locked: boolean;
  participationStatus: ParticipationStatus;
  onToggle: (date: string, meal: Meal) => void;
  onPaintStart: (date: string, meal: Meal, selected: boolean) => void;
  onPaintEnter: (date: string, meal: Meal) => void;
  onToggleLock: (weekIndex: number) => void;
  onSelectWeek: (slots: SelectedSlot[]) => void;
  onClearWeek: (slots: SelectedSlot[]) => void;
  onToggleUnavailable: () => void;
};

export function WeekTable({
  week,
  selectedKeys,
  locked,
  participationStatus,
  onToggle,
  onPaintStart,
  onPaintEnter,
  onToggleLock,
  onSelectWeek,
  onClearWeek,
  onToggleUnavailable,
}: WeekTableProps) {
  const weekSlots = week.days.flatMap((day) => MEALS.map((meal) => ({ date: day.date, meal })));
  const isLastWeek = week.index === 5;
  const isUnavailable = participationStatus === "unavailable";

  return (
    <section
      aria-labelledby={`week-${week.index}`}
      className="rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`week-${week.index}`} className="min-w-0 flex-1 text-lg font-bold text-stone-950">
          {week.title}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            aria-label={`全选第${week.index}周`}
            disabled={locked}
            onClick={() => onSelectWeek(weekSlots)}
            className={[
              "min-h-9 rounded-md border px-3 text-sm font-bold",
              locked
                ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                : "border-stone-300 bg-white text-stone-700",
            ].join(" ")}
          >
            全选
          </button>
          <button
            type="button"
            aria-label={`清空第${week.index}周`}
            disabled={locked}
            onClick={() => onClearWeek(weekSlots)}
            className={[
              "min-h-9 rounded-md border px-3 text-sm font-bold",
              locked
                ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                : "border-stone-300 bg-white text-stone-700",
            ].join(" ")}
          >
            清空
          </button>
        </div>
      </div>

      <div className="mt-3 md:hidden">
        <div className="grid w-full grid-cols-3 gap-2">
          {week.days.map((day) => (
            <div
              key={day.date}
              className="min-w-0 rounded-md border border-amber-300 bg-amber-50 p-1"
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
        {isLastWeek ? (
          <UnavailableOption selected={isUnavailable} onToggle={onToggleUnavailable} />
        ) : null}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[460px] border-separate border-spacing-2">
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
                  className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
                >
                  <span className="block">{day.weekdayName}</span>
                  <span className="block text-base font-black">
                    {day.month}/{day.day}
                  </span>
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
        {isLastWeek ? (
          <UnavailableOption selected={isUnavailable} onToggle={onToggleUnavailable} />
        ) : null}
      </div>
    </section>
  );
}

type UnavailableOptionProps = {
  selected: boolean;
  onToggle: () => void;
};

function UnavailableOption({ selected, onToggle }: UnavailableOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? "已选择本次无法参与" : "选择本次无法参与"}
      data-testid="unavailable-option"
      onClick={onToggle}
      className={[
        "mt-3 min-h-14 w-full rounded-lg border px-4 py-3 text-left transition",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-200",
        selected
          ? "border-teal-700 bg-teal-700 text-white shadow-sm"
          : "border-amber-300 bg-amber-50 text-stone-900 active:bg-amber-100",
      ].join(" ")}
    >
      <span className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-lg">
          {selected ? "✓" : "○"}
        </span>
        <span>
          <span className="block text-sm font-black sm:text-base">
            以上时间都不合适 / 这段时间在外地，本次无法参与
          </span>
          <span
            className={[
              "mt-1 block text-xs leading-5",
              selected ? "text-teal-50" : "text-stone-600",
            ].join(" ")}
          >
            选择后会清空已选午餐和晚餐，并作为一次完整提交保存。
          </span>
        </span>
      </span>
    </button>
  );
}
