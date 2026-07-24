type UnavailableOptionProps = {
  selected: boolean;
  onToggle: () => void;
};

export function UnavailableOption({ selected, onToggle }: UnavailableOptionProps) {
  return (
    <section
      aria-labelledby="unavailable-title"
      className="mt-5 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={selected ? "已选择本次无法参与" : "选择本次无法参与"}
        data-testid="unavailable-option"
        onClick={onToggle}
        className={[
          "min-h-16 w-full rounded-lg border px-4 py-3 text-left transition",
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
            <span id="unavailable-title" className="block text-sm font-black sm:text-base">
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
    </section>
  );
}
