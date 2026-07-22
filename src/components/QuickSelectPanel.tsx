import { useMemo, useState } from "react";
import { buildDateRange, MEAL_LABEL } from "../lib/dates";
import type { Meal } from "../types";

type QuickSelectPanelProps = {
  onApply: (startDate: string, endDate: string, meals: Meal[], selected: boolean) => void;
  onClearAll: () => void;
};

export function QuickSelectPanel({ onApply, onClearAll }: QuickSelectPanelProps) {
  const days = useMemo(() => buildDateRange(), []);
  const [startDate, setStartDate] = useState("2026-07-30");
  const [endDate, setEndDate] = useState("2026-08-06");
  const [includeLunch, setIncludeLunch] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);

  const meals = useMemo(() => {
    const selectedMeals: Meal[] = [];
    if (includeLunch) selectedMeals.push("lunch");
    if (includeDinner) selectedMeals.push("dinner");
    return selectedMeals;
  }, [includeDinner, includeLunch]);

  const canApply = meals.length > 0;

  return (
    <section
      aria-labelledby="quick-select-title"
      className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="quick-select-title" className="text-lg font-black text-stone-950">
            快速选择一段日期
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-700">
            适合连续几天都有空的情况。也可以直接按住表格里的格子拖动涂抹。
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-teal-900">
          点击提交前不会保存
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(260px,1fr)_auto] md:items-end">
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          开始日期
          <select
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="min-h-12 rounded-md border border-stone-300 bg-white px-3"
          >
            {days.map((day) => (
              <option key={day.date} value={day.date}>
                {day.month}/{day.day} {day.weekdayName}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-stone-800">
          结束日期
          <select
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="min-h-12 rounded-md border border-stone-300 bg-white px-3"
          >
            {days.map((day) => (
              <option key={day.date} value={day.date}>
                {day.month}/{day.day} {day.weekdayName}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="rounded-md border border-teal-200 bg-white px-3 py-2">
          <legend className="px-1 text-sm font-bold text-stone-800">选择时段</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-800">
              <input
                type="checkbox"
                checked={includeLunch}
                onChange={(event) => setIncludeLunch(event.target.checked)}
                className="h-5 w-5 accent-teal-700"
              />
              {MEAL_LABEL.lunch}
            </label>
            <label className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-800">
              <input
                type="checkbox"
                checked={includeDinner}
                onChange={(event) => setIncludeDinner(event.target.checked)}
                className="h-5 w-5 accent-teal-700"
              />
              {MEAL_LABEL.dinner}
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={onClearAll}
          className="min-h-12 rounded-md border border-red-200 bg-white px-4 font-bold text-red-700"
        >
          清空所有选择
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(startDate, endDate, meals, true)}
          className="min-h-12 rounded-md bg-teal-700 px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          选中这段时间
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(startDate, endDate, meals, false)}
          className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-bold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          取消这段选择
        </button>
      </div>
    </section>
  );
}
