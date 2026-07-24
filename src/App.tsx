import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NameLookupPanel } from "./components/NameLookupPanel";
import { ResultsPage } from "./components/ResultsPage";
import { SubmitPanel } from "./components/SubmitPanel";
import { WeekTable } from "./components/WeekTable";
import { buildWeeks, isValidMeal, slotKey } from "./lib/dates";
import { MissingSupabaseConfigError } from "./lib/api";
import { validateDisplayName, normalizeDisplayName } from "./lib/name";
import {
  createParticipantToken,
  getParticipantTokenForName,
  getStoredParticipantToken,
  removeParticipantTokenForName,
  saveParticipantTokenForName,
} from "./lib/participantToken";
import {
  keysToSlots,
  setSlotSelected,
  setSlotsSelected,
  slotsToKeys,
  toggleSlot,
  validateSlots,
} from "./lib/selection";
import type { AppApi, Meal, ParticipationStatus } from "./types";

type AppProps = {
  api: AppApi;
};

type SubmitState = "idle" | "submitting" | "success" | "error";
type PaintMode = {
  selected: boolean;
  lastKey: string | null;
};

export default function App({ api }: AppProps) {
  const [route, setRoute] = useState(() =>
    window.location.hash === "#results" ? "results" : "form",
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus>("available");
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isExistingParticipant, setIsExistingParticipant] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isClearLoading, setIsClearLoading] = useState(false);
  const [loadedSubmissionName, setLoadedSubmissionName] = useState<string | null>(null);
  const [lockedWeekIndexes, setLockedWeekIndexes] = useState<Set<number>>(() => new Set());
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
        setParticipationStatus(submission.participationStatus ?? "available");
        setIsExistingParticipant(true);
        setLoadedSubmissionName(submission.displayName);
        saveParticipantTokenForName(submission.displayName, token);
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
    setParticipationStatus("available");
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
      if (!date || !meal || !isValidMeal(meal) || slotElement.dataset.slotLocked === "true") {
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
    setParticipationStatus("available");
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

  const handleSelectWeek = useCallback((slots: { date: string; meal: Meal }[]) => {
    setSubmitState((current) => (current === "success" ? "idle" : current));
    setParticipationStatus("available");
    setSelectedKeys((current) => setSlotsSelected(current, slots, true));
  }, []);

  const handleToggleUnavailable = useCallback(() => {
    setSubmitState((current) => (current === "success" ? "idle" : current));
    if (participationStatus === "unavailable") {
      setParticipationStatus("available");
    } else {
      setSelectedKeys(new Set());
      setParticipationStatus("unavailable");
    }
  }, [participationStatus]);

  const handleToggleWeekLock = useCallback((weekIndex: number) => {
    setLockedWeekIndexes((current) => {
      const next = new Set(current);
      if (next.has(weekIndex)) {
        next.delete(weekIndex);
      } else {
        next.add(weekIndex);
      }
      return next;
    });
  }, []);

  const handleLookupByName = useCallback(async () => {
    if (isLookupLoading || isClearLoading) {
      return;
    }

    const normalizedName = normalizeDisplayName(displayName);
    const validationError = validateDisplayName(normalizedName);
    setNameError(validationError);
    setLookupMessage(null);
    setSubmitError(null);

    if (validationError) {
      return;
    }

    setIsLookupLoading(true);
    try {
      const submission = await api.findSubmissionByName(normalizedName);
      if (!submission) {
        setLookupMessage("没有找到这个名字的提交记录。");
        return;
      }

      setDisplayName(submission.displayName);
      setSelectedKeys(slotsToKeys(submission.slots));
      setParticipationStatus(submission.participationStatus ?? "available");
      setSubmitState((current) => (current === "success" ? "idle" : current));
      setIsExistingParticipant(true);
      setLoadedSubmissionName(submission.displayName);
      setLookupMessage("已加载这个名字最近一次提交的时间表。");
    } catch (error) {
      if (error instanceof MissingSupabaseConfigError) {
        setLookupMessage("Supabase 配置缺失，请检查环境变量。");
      } else {
        setLookupMessage("搜索失败，请重试。");
      }
    } finally {
      setIsLookupLoading(false);
    }
  }, [api, displayName, isClearLoading, isLookupLoading]);

  const handleClearSubmissionByName = useCallback(async () => {
    if (isLookupLoading || isClearLoading) {
      return;
    }

    const normalizedName = normalizeDisplayName(displayName);
    const validationError = validateDisplayName(normalizedName);
    setNameError(validationError);
    setLookupMessage(null);
    setSubmitError(null);

    if (validationError) {
      return;
    }

    const participantToken = getParticipantTokenForName(normalizedName);
    if (!participantToken) {
      setLookupMessage("本浏览器没有这个名字的可清空记录。");
      return;
    }

    if (
      !window.confirm(`确定要清空「${normalizedName}」已经填写的记录吗？清空后统计人数也会减少。`)
    ) {
      return;
    }

    setIsClearLoading(true);
    try {
      await api.clearSubmission({
        participantToken,
        displayName: normalizedName,
      });
      removeParticipantTokenForName(normalizedName);
      setDisplayName(normalizedName);
      setSelectedKeys(new Set());
      setParticipationStatus("available");
      setIsExistingParticipant(false);
      setLoadedSubmissionName(null);
      setSubmitState("idle");
      setLookupMessage("已清空这个名字的提交记录。");
    } catch (error) {
      if (error instanceof MissingSupabaseConfigError) {
        setLookupMessage("Supabase 配置缺失，请检查环境变量。");
      } else {
        setLookupMessage("清空失败，请重试。");
      }
    } finally {
      setIsClearLoading(false);
    }
  }, [api, displayName, isClearLoading, isLookupLoading]);

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

    const slots =
      participationStatus === "unavailable" ? [] : validateSlots(keysToSlots(selectedKeys));
    if (
      participationStatus === "available" &&
      slots.length === 0 &&
      !window.confirm("你尚未选择任何时间，是否仍要提交？")
    ) {
      return;
    }

    const existingToken = getParticipantTokenForName(normalizedName);
    const participantToken = existingToken ?? createParticipantToken();

    setSubmitState("submitting");
    try {
      await api.submitAvailability({
        participantToken,
        displayName: normalizedName,
        slots,
        participationStatus,
      });
      saveParticipantTokenForName(normalizedName, participantToken);
      setDisplayName(normalizedName);
      setIsExistingParticipant(true);
      setLoadedSubmissionName(normalizedName);
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
  }, [api, displayName, participationStatus, selectedKeys, submitState]);

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
        <h1 className="text-3xl font-black text-stone-950 sm:text-4xl">聚会时间统计</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700">
          请先输入你的名字，再选择7月27日至8月30日期间每周五、周六、周日有空的午餐和晚餐时间。可以点击单个格子，也可以长按并拖拽涂抹来一次选中多个日期；如果以上时间都不合适或这段时间在外地，可以在第五周末尾选择本次无法参与。完成选择后，请在页面底部点击提交。
        </p>
      </header>

      {isRestoring ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-stone-200 bg-white p-4 text-sm font-bold text-stone-700"
        >
          正在加载你之前的提交……
        </div>
      ) : null}

      {restoreMessage ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          {restoreMessage}
        </div>
      ) : null}

      <NameLookupPanel
        displayName={displayName}
        nameError={nameError}
        lookupMessage={lookupMessage}
        isLookupLoading={isLookupLoading}
        isClearLoading={isClearLoading}
        onNameChange={(value) => {
          setDisplayName(value);
          setNameError(null);
          setLookupMessage(null);
          const normalizedName = normalizeDisplayName(value);
          setLoadedSubmissionName((current) => (current === normalizedName ? current : null));
          setIsExistingParticipant(
            Boolean(getParticipantTokenForName(normalizedName)) ||
              loadedSubmissionName === normalizedName,
          );
          setSubmitState((current) => (current === "success" ? "idle" : current));
        }}
        onLookup={handleLookupByName}
        onClearSubmission={handleClearSubmissionByName}
      />

      <section aria-labelledby="choose-title" className="mt-6">
        <h2 id="choose-title" className="text-2xl font-black text-stone-950">
          请选择你有空的时间
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          点击单元格可以切换状态；按住一个单元格拖过其它单元格，可以像涂色一样快速选择或取消一片时间。当前只显示每周五、周六、周日，所有日期统一用淡黄色显示。
        </p>
        <div className="mt-4 grid gap-5">
          {weeks.map((week) => (
            <WeekTable
              key={week.index}
              week={week}
              selectedKeys={selectedKeys}
              locked={lockedWeekIndexes.has(week.index)}
              participationStatus={participationStatus}
              onToggle={handleToggle}
              onPaintStart={handlePaintStart}
              onPaintEnter={handlePaintEnter}
              onToggleLock={handleToggleWeekLock}
              onSelectWeek={handleSelectWeek}
              onClearWeek={handleClearWeek}
              onToggleUnavailable={handleToggleUnavailable}
            />
          ))}
        </div>
      </section>

      <div className="mt-6">
        <SubmitPanel
          isExistingParticipant={isExistingParticipant}
          isSubmitting={submitState === "submitting"}
          submitSucceeded={submitState === "success"}
          submitError={submitState === "error" ? submitError : null}
          onSubmit={handleSubmit}
          onEdit={() => setSubmitState("idle")}
          onViewStats={showResults}
        />
      </div>
    </main>
  );
}
