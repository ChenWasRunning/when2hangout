type SubmitPanelProps = {
  isExistingParticipant: boolean;
  isSubmitting: boolean;
  submitSucceeded: boolean;
  submitError: string | null;
  onSubmit: () => void;
  onEdit: () => void;
  onViewStats: () => void;
};

export function SubmitPanel({
  isExistingParticipant,
  isSubmitting,
  submitSucceeded,
  submitError,
  onSubmit,
  onEdit,
  onViewStats,
}: SubmitPanelProps) {
  const submitLabel = isExistingParticipant ? "更新提交" : "提交时间";

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="submit-title">
      <h2 id="submit-title" className="text-xl font-black text-stone-950">
        提交你的时间
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        你的选择只保存在当前页面中，点击{submitLabel}后才会保存到后台。
      </p>

      {submitError ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {submitError}
        </p>
      ) : null}

      {submitSucceeded ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
          <p className="font-bold text-teal-900">提交成功，感谢你的填写！</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onEdit}
              className="min-h-12 rounded-md border border-teal-700 bg-white px-4 font-bold text-teal-800"
            >
              修改我的选择
            </button>
            <button
              type="button"
              onClick={onViewStats}
              className="min-h-12 rounded-md bg-teal-700 px-4 font-bold text-white"
            >
              查看统计结果
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="min-h-12 rounded-md bg-teal-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "正在提交……" : submitLabel}
          </button>
          <button
            type="button"
            onClick={onViewStats}
            className="min-h-12 rounded-md border border-stone-300 bg-white px-5 font-bold text-stone-800"
          >
            查看统计结果
          </button>
        </div>
      )}
    </section>
  );
}
