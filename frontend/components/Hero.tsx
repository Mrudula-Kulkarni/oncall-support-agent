/**
 * The header.
 *
 * It used to be two paragraphs of prose with bold lead-ins, which is writing rather than
 * design — a reader had to work through it to find the point. The point is a contrast, so it
 * is drawn as one: the same incident handled by hand, then handled here.
 */

const BY_HAND = [
  "Find the logs for the right service, in the right time window",
  "Work out which of the last deploys caused it",
  "Search a codebase you may not have written",
  "Remember whether this has happened before",
];

const HERE = [
  "Reads the logs and the recent deploys for you",
  "Names the exact file and function at fault",
  "Suggests a fix, based on how the team fixed it last time",
  "Says how confident it is — and stops if it isn't",
];

function Tick({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={`mt-[3px] h-3 w-3 shrink-0 ${muted ? "text-ink-faint" : "text-emerald-400"}`}
    >
      {muted ? (
        <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      ) : (
        <path
          d="M2 6.3 4.8 9 10 3.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function Hero() {
  return (
    <header className="grid-texture border-b border-line bg-surface/40">
      <div className="mx-auto max-w-[88rem] px-5 py-8 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-500/30">
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.6)]" />
          </span>
          <h1 className="text-[17px] font-semibold tracking-tight text-ink">
            On-Call Support Agent
          </h1>
          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint ring-1 ring-inset ring-line">
            demo
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-dim">
          A service breaks. An engineer gets paged at 3am. Before they can fix anything, they
          have to work out <span className="text-ink">what broke and where</span> — and that is
          the slow part.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
          {/* by hand */}
          <div className="rounded-xl border border-line bg-base/40 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-ink-dim">Doing it by hand</h2>
              <span className="font-mono text-sm font-semibold text-rose-300">
                10&ndash;30 min
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {BY_HAND.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-faint">
                  <Tick muted />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* here */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.05] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-ink">With these four agents</h2>
              <span className="font-mono text-sm font-semibold text-emerald-300">
                ~10 sec
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {HERE.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-dim">
                  <Tick />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-faint">
          It only ever <span className="text-ink-dim">suggests</span>. Nothing is run against
          any system, and every alert here is sample data from a made-up online shop.
        </p>
      </div>
    </header>
  );
}
