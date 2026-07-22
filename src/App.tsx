import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResultsPage } from "./components/ResultsPage";
import { SubmitPanel } from "./components/SubmitPanel";
import { WeekTable } from "./components/WeekTable";
import {
  buildWeeks,
  EVENT_END_DATE,
  EVENT_START_DATE,
  isValidMeal,
  slotKey,
} from "./lib/dates";
import { MissingSupabaseConfigError } from "./lib/api";
import { validateDisplayName, normalizeDisplayName } from "./lib/name";
import {
  createParticipantToken,
  getStoredParticipantToken,
  saveParticipantToken,
} from "./lib/participantToken";
import {
  keysToSlots,
  setSlotSelected,
  setSlotsSelected,
  slotsToKeys,
  toggleSlot,
  validateSlots,
} from "./lib/selection";
import type { AppApi, Meal } from "./types";

type AppProps = {
  api: AppApi;
};

type SubmitState = "idle" | "submitting" | "success" | "error";
type PaintMode = {
  selected: boolean;
  lastKey: string | null;
};

export default function App({ api }: AppProps) {
  const [route, setRoute] = useState(() => (window.location.hash === "#results" ? "results" : "form"));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isExistingParticipant, setIsExistingParticipant] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const paintModeRef = useRef<PaintMode | null>(null);

  const weeks = useMemo(() => buildWeeks(), []);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash === "#results" ? "results" : "form");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const token = getStoredParticipantToken();
    if (!token) {
      return;
    }

    let active = true;
    setIsRestoring(true);
    api
      .getMySubmission(token)
      .then((submission) => {
        if (!active || !submission) return;
        setDisplayName(submission.displayName);
        setSelectedKeys(slotsToKeys(submission.slots));
        setIsExistingParticipant(true);
        setRestoreMessage("已恢复你之前提交的结果。修改后请点击“更新提交”。");
      })
      .catch(() => {
        if (!active) return;
        setRestoreMessage("participant token 失效，请作为新参与者重新填写。");
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [api]);

  const paintSlot = useCallback((date: string, meal: Meal, selected: boolean) => {
    const key = slotKey({ date, meal });
    const paintMode = paintModeRef.current;
    if (paintMode?.lastKey === key) {
      return;
    }

    if (paintMode) {
      paintMode.lastKey = key;
    }

    setSubmitState((current) => (current === "success" ? "idle" : current));
    setSelectedKeys((current) => setSlotSelected(current, { date, meal }, selected));
  }, []);

  useEffect(() => {
    const stopPainting = () => {
      paintModeRef.current = null;
    };

    const continueTouchPainting = (event: PointerEvent) => {
      const paintMode = paintModeRef.current;
      if (!paintMode) {
        return;
      }

      event.preventDefault();
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const slotElement = element?.closest("[data-slot-date][data-slot-meal]");
      if (!(slotElement instanceof HTMLElement)) {
        return;
      }

      const date = slotElement.dataset.slotDate;
      const meal = slotElement.dataset.slotMeal;
      if (!date || !meal || !isValidMeal(meal)) {
        return;
      }

      paintSlot(date, meal, paintMode.selected);
    };

    window.addEventListener("pointermove", continueTouchPainting, { passive: false });
    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);

    return () => {
      window.removeEventListener("pointermove", continueTouchPainting);
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
    };
  }, [paintSlot]);

  const handleToggle = useCallback((date: string, meal: Meal) => {
    setSubmitState((current) => (current === "success" ? "idle" : current));
    setSelectedKeys((current) => toggleSlot(current, { date, meal }));
  }, []);

  const handlePaintStart = useCallback(
    (date: string, meal: Meal, selected: boolean) => {
      const nextSelected = !selected;
      paintModeRef.current = {
        selected: nextSelected,
        lastKey: null,
      };
      paintSlot(date, meal, nextSelected);
    },
    [paintSlot],
  );

  const handlePaintEnter = useCallback(
    (date: string, meal: Meal) => {
      const paintMode = paintModeRef.current;
      if (!paintMode) {
        return;
      }
      paintSlot(date, meal, paintMode.selected);
    },
    [paintSlot],
  );

  const handleClearWeek = useCallback((slots: { date: string; meal: Meal }[]) => {
    setSubmitState((current) => (current === "success" ? "idle" : current));
    setSelectedKeys((current) => setSlotsSelected(current, slots, false));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitState === "submitting") {
      return;
    }

    const normalizedName = normalizeDisplayName(displayName);
    const validationError = validateDisplayName(normalizedName);
    setNameError(validationError);
    setSubmitError(null);

    if (validationError) {
      return;
    }

    const slots = validateSlots(keysToSlots(selectedKeys));
    if (slots.length === 0 && !window.confirm("你尚未选择任何时间，是否仍要提交？")) {
      return;
    }

    const existingToken = getStoredParticipantToken();
    const participantToken = existingToken ?? createParticipantToken();

    setSubmitState("submitting");
    try {
      await api.submitAvailability({
        participantToken,
        displayName: normalizedName,
        slots,
      });
      if (!existingToken) {
        saveParticipantToken(participantToken);
      }
      setDisplayName(normalizedName);
      setIsExistingParticipant(true);
      setSubmitState("success");
      setSubmitError(null);
    } catch (error) {
      setSubmitState("error");
      if (error instanceof MissingSupabaseConfigError) {
        setSubmitError("Supabase 配置缺失，请检查环境变量。");
      } else {
        setSubmitError("提交失败，请重试");
      }
    }
  }, [api, displayName, selectedKeys, submitState]);

  const showResults = useCallback(() => {
    window.location.hash = "results";
    setRoute("results");
  }, []);

  const showForm = useCallback(() => {
    window.location.hash = "";
    setRoute("form");
  }, []);

  if (route === "results") {
    return <ResultsPage api={api} onBack={showForm} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-6">
      <header className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-teal-800">微信群分享版</p>
        <h1 className="mt-1 text-3xl font-black text-stone-950 sm:text-4xl">聚会时间统计</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700">
          请选择你在7月27日至8月30日期间有空的午餐和晚餐时间。可以点击单个格子，也可以长按并拖拽涂抹来一次选中多个日期。完成选择后，请在页面底部输入名字并点击提交。
        </p>
        <p className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900">
          固定日期：{EVENT_START_DATE} 至 {EVENT_END_DATE}
        </p>
      </header>

      {isRestoring ? (
        <div role="status" className="mt-4 rounded-lg border border-stone-200 bg-white p-4 text-sm font-bold text-stone-700">
          正在加载你之前的提交……
        </div>
      ) : null}

      {restoreMessage ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          {restoreMessage}
        </div>
      ) : null}

      <section aria-labelledby="choose-title" className="mt-6">
        <h2 id="choose-title" className="text-2xl font-black text-stone-950">
          请选择你有空的时间
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          点击单元格可以切换状态；按住一个单元格拖过其它单元格，可以像涂色一样快速选择或取消一片时间。带有“周末”文字的日期为周六或周日。
        </p>
        <div className="mt-4 grid gap-5">
          {weeks.map((week) => (
            <WeekTable
              key={week.index}
              week={week}
              selectedKeys={selectedKeys}
              onToggle={handleToggle}
              onPaintStart={handlePaintStart}
              onPaintEnter={handlePaintEnter}
              onClearWeek={handleClearWeek}
            />
          ))}
        </div>
      </section>

      <div className="mt-6">
        <SubmitPanel
          displayName={displayName}
          nameError={nameError}
          isExistingParticipant={isExistingParticipant}
          isSubmitting={submitState === "submitting"}
          submitSucceeded={submitState === "success"}
          submitError={submitState === "error" ? submitError : null}
          onNameChange={(value) => {
            setDisplayName(value);
            setNameError(null);
            setSubmitState((current) => (current === "success" ? "idle" : current));
          }}
          onSubmit={handleSubmit}
          onEdit={() => setSubmitState("idle")}
          onViewStats={showResults}
        />
      </div>
    </main>
  );
}
