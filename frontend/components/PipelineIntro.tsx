/**
 * Shown before an alert is picked.
 *
 * One quiet line and nothing more. The Overview page explains the agents and the data, so this
 * page is just the list; the line is here only so the empty right side does not look broken.
 */

export function PipelineIntro() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
        <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 text-brand">
          <path d="M12 5 7 10l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-4 text-sm font-medium text-ink">No alert selected</p>
      <p className="mt-1 text-sm text-ink-3">Pick one from the list to see what happened.</p>
    </div>
  );
}
