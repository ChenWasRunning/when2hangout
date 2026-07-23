import { useEffect, useMemo, useState } from "react";
import { buildWeeks, MEAL_LABEL, slotKey } from "../lib/dates";
import { availabilityBackgroundColor, calculateDailyRatio } from "../lib/resultsColor";
import type { AppApi, Meal, StatsResponse, StatsSlot } from "../types";

type ResultsPageProps = {
  api: AppApi;
  onBack: () => void;
};

type LoadState = "loading" | "success" | "error";

export function ResultsPage({ api, onBack }: ResultsPageProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<StatsResponse | null>(null);

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

  const weeks = useMemo(() => buildWeeks(), []);

  const maxDailyRatio = useMemo(() => {
    if (!stats || stats.totalSubmissions === 0) {
      return 0;
    }

    return Math.max(
      ...weeks.flatMap((week) =>
        week.days.map((day) =>
          calculateDailyRatio(
            slotMap.get(slotKey({ date: day.date, meal: "lunch" }))?.availableCount ?? 0,
            slotMap.get(slotKey({ date: day.date, meal: "dinner" }))?.availableCount ?? 0,
            stats.totalSubmissions,
          ),
        ),
      ),
    );
  }, [slotMap, stats, weeks]);

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
        {stats && stats.totalSubmissions > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="inline-flex rounded-full bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900">
              共 {stats.totalSubmissions} 人提交
            </p>
            <ColorLegend />
          </div>
        ) : null}
      </header>

      {loadState === "loading" ? <StatusBlock text="正在加载统计结果……" /> : null}

      {loadState === "error" ? <StatusBlock text="统计数据加载失败，请稍后重试。" danger /> : null}

      {loadState === "success" && stats?.totalSubmissions === 0 ? (
        <StatusBlock text="暂无提交记录" />
      ) : null}

      {loadState === "success" && stats && stats.totalSubmissions > 0 ? (
        <section
          aria-label="每日可用人数矩阵"
          className="mt-5 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-5"
        >
          <div className="grid gap-3">
            {weeks.map((week) => (
              <div key={week.index}>
                <h2 className="text-base font-black text-stone-950">{week.title}</h2>
                <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
                  {week.days.map((day) => (
                    <DayStatsCell
                      key={day.date}
                      dateLabel={`${day.month}/${day.day}`}
                      weekday={day.weekdayName}
                      lunch={slotMap.get(slotKey({ date: day.date, meal: "lunch" }))?.availableCount ?? 0}
                      dinner={
                        slotMap.get(slotKey({ date: day.date, meal: "dinner" }))?.availableCount ?? 0
                      }
                      total={stats.totalSubmissions}
                      maxDailyRatio={maxDailyRatio}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ColorLegend() {
  return (
    <div aria-label="颜色说明：红色表示有空比例少，绿色表示有空比例多" className="flex items-center gap-2">
      <span className="text-xs font-bold text-stone-600">少</span>
      <div
        aria-hidden="true"
        className="h-3 w-28 rounded-full border border-stone-200 sm:w-36"
        style={{
          background: `linear-gradient(to right, ${availabilityBackgroundColor(0)}, ${availabilityBackgroundColor(0.5)}, ${availabilityBackgroundColor(1)})`,
        }}
      />
      <span className="text-xs font-bold text-stone-600">多</span>
    </div>
  );
}

function DayStatsCell({
  dateLabel,
  weekday,
  lunch,
  dinner,
  total,
  maxDailyRatio,
}: {
  dateLabel: string;
  weekday: string;
  lunch: number;
  dinner: number;
  total: number;
  maxDailyRatio: number;
}) {
  const ratio = calculateDailyRatio(lunch, dinner, total);
  const normalizedRatio = maxDailyRatio > 0 ? ratio / maxDailyRatio : 0;

  return (
    <div
      aria-label={`${dateLabel} ${weekday}，午餐 ${lunch}/${total}，晚餐 ${dinner}/${total}`}
      className="min-w-0 rounded-md border border-stone-200 p-1.5 text-center sm:p-3"
      style={{ backgroundColor: availabilityBackgroundColor(normalizedRatio) }}
    >
      <div className="text-[11px] font-bold leading-4 text-stone-600 sm:text-sm">{weekday}</div>
      <div className="text-sm font-black leading-5 text-stone-950 sm:text-lg">{dateLabel}</div>
      <div className="mt-2 grid gap-1">
        <CountLine meal="lunch" count={lunch} total={total} />
        <CountLine meal="dinner" count={dinner} total={total} />
      </div>
    </div>
  );
}

function CountLine({ meal, count, total }: { meal: Meal; count: number; total: number }) {
  return (
    <div className="rounded bg-white/75 px-1 py-1 text-[11px] font-bold leading-4 text-stone-800 sm:text-sm">
      <span className="block sm:inline">{MEAL_LABEL[meal]}</span>
      <span className="block text-teal-800 sm:ml-1 sm:inline">
        {count}/{total}
      </span>
    </div>
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
