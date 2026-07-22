import { useEffect, useMemo, useState } from "react";
import { buildWeeks, formatDateWithWeekday, MEALS, MEAL_LABEL, slotKey } from "../lib/dates";
import { sortBestSlots } from "../lib/stats";
import type { AppApi, Meal, StatsResponse, StatsSlot } from "../types";

type ResultsPageProps = {
  api: AppApi;
  onBack: () => void;
};

type LoadState = "loading" | "success" | "error";

export function ResultsPage({ api, onBack }: ResultsPageProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<StatsSlot | null>(null);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    api
      .getStats()
      .then((result) => {
        if (!active) return;
        setStats(result);
        setLoadState("success");
      })
      .catch(() => {
        if (!active) return;
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [api]);

  const slotMap = useMemo(() => {
    const map = new Map<string, StatsSlot>();
    for (const slot of stats?.slots ?? []) {
      map.set(slotKey(slot), slot);
    }
    return map;
  }, [stats]);

  const bestSlots = useMemo(() => sortBestSlots(stats?.slots ?? []).slice(0, 10), [stats]);
  const weeks = useMemo(() => buildWeeks(), []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 min-h-11 rounded-md border border-stone-300 bg-white px-4 font-bold text-stone-800"
      >
        返回填写
      </button>

      <header className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-teal-800">查看统计结果</p>
        <h1 className="mt-1 text-3xl font-black text-stone-950">聚会时间统计结果</h1>
      </header>

      {loadState === "loading" ? (
        <StatusBlock text="正在加载统计结果……" />
      ) : null}

      {loadState === "error" ? (
        <StatusBlock text="统计数据加载失败，请稍后重试。" danger />
      ) : null}

      {loadState === "success" && stats?.totalSubmissions === 0 ? (
        <StatusBlock text="暂无提交记录" />
      ) : null}

      {loadState === "success" && stats && stats.totalSubmissions > 0 ? (
        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-teal-800">最佳时间</p>
                <h2 className="text-xl font-black text-stone-950">人数最多的前10个时段</h2>
              </div>
              <p className="rounded-full bg-white px-3 py-2 text-sm font-bold text-stone-700">
                共 {stats.totalSubmissions} 人提交
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bestSlots.map((slot, index) => (
                <button
                  key={slotKey(slot)}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className="min-h-24 rounded-md border border-teal-200 bg-white p-4 text-left shadow-sm"
                >
                  <span className="text-sm font-bold text-teal-800">第 {index + 1} 名</span>
                  <span className="mt-1 block text-base font-black text-stone-950">
                    {formatDateWithWeekday(slot.date)} {MEAL_LABEL[slot.meal]}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-stone-600">
                    {slot.availableCount} / {stats.totalSubmissions} 人有空
                  </span>
                </button>
              ))}
            </div>
          </section>

          {selectedSlot ? (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-black text-stone-950">
                {formatDateWithWeekday(selectedSlot.date)} {MEAL_LABEL[selectedSlot.meal]} 有空名单
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                {selectedSlot.participantNames.length
                  ? selectedSlot.participantNames.join("、")
                  : "这个时段暂时没有人有空。"}
              </p>
            </section>
          ) : null}

          {weeks.map((week) => (
            <section key={week.index} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-stone-950">{week.title}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                {week.days.map((day) => (
                  <div
                    key={day.date}
                    className={[
                      "rounded-md border p-3",
                      day.isWeekend ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-stone-50",
                    ].join(" ")}
                  >
                    <h3 className="font-black text-stone-950">
                      {day.month}月{day.day}日
                    </h3>
                    <p className="text-sm font-semibold text-stone-600">
                      {day.weekdayName}
                      {day.isWeekend ? "｜周末" : ""}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {MEALS.map((meal) => (
                        <ResultSlotButton
                          key={meal}
                          slot={slotMap.get(slotKey({ date: day.date, meal })) ?? {
                            date: day.date,
                            meal,
                            availableCount: 0,
                            participantNames: [],
                          }}
                          meal={meal}
                          total={stats.totalSubmissions}
                          onSelect={setSelectedSlot}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function StatusBlock({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div
      role={danger ? "alert" : "status"}
      className={[
        "mt-5 rounded-lg border p-5 text-center font-bold",
        danger ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-white text-stone-700",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

function ResultSlotButton({
  slot,
  meal,
  total,
  onSelect,
}: {
  slot: StatsSlot;
  meal: Meal;
  total: number;
  onSelect: (slot: StatsSlot) => void;
}) {
  const isPopular = total > 0 && slot.availableCount === Math.max(slot.availableCount, Math.ceil(total * 0.75));

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className={[
        "min-h-14 rounded-md border px-3 py-2 text-left",
        isPopular
          ? "border-teal-600 bg-teal-700 text-white"
          : "border-stone-300 bg-white text-stone-800",
      ].join(" ")}
    >
      <span className="block text-sm font-black">{MEAL_LABEL[meal]}</span>
      <span className="block text-sm font-semibold">
        {slot.availableCount} / {total} 人有空
      </span>
    </button>
  );
}
