/**
 * Shown before an alert is picked.
 *
 * One quiet line and nothing more. The Overview page explains the agents and the data, so this
 * page is just the list; the line is here only so the empty right side does not look broken.
 */

export function PipelineIntro() {
  return (
    <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-line-strong p-6">
      <p className="text-sm text-ink-3">Pick an alert on the left to see what happened.</p>
    </div>
  );
}
