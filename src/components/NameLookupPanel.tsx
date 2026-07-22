type NameLookupPanelProps = {
  displayName: string;
  nameError: string | null;
  lookupMessage: string | null;
  isLookupLoading: boolean;
  onNameChange: (value: string) => void;
  onLookup: () => void;
};

export function NameLookupPanel({
  displayName,
  nameError,
  lookupMessage,
  isLookupLoading,
  onNameChange,
  onLookup,
}: NameLookupPanelProps) {
  return (
    <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="name-title">
      <h2 id="name-title" className="text-lg font-black text-stone-950">
        填写你的名字
      </h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        如果你之前已经提交过，可以输入同一个名字并点击搜索，页面会加载最近一次提交的时间表。
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label htmlFor="display-name" className="sr-only">
          你的名字
        </label>
        <input
          id="display-name"
          value={displayName}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "name-error" : lookupMessage ? "lookup-message" : undefined}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="请输入你的名字"
          className="min-h-12 w-full rounded-md border border-stone-300 bg-white px-4 text-base"
        />
        <button
          type="button"
          disabled={isLookupLoading}
          onClick={onLookup}
          className="min-h-12 rounded-md border border-teal-700 bg-white px-5 font-bold text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLookupLoading ? "搜索中……" : "搜索"}
        </button>
      </div>

      {nameError ? (
        <p id="name-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {nameError}
        </p>
      ) : null}
      {lookupMessage ? (
        <p id="lookup-message" role="status" className="mt-2 text-sm font-semibold text-stone-700">
          {lookupMessage}
        </p>
      ) : null}
    </section>
  );
}
