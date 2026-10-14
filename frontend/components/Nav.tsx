import Link from "next/link";
import { ArrowRight, Button } from "./ui";

/** Shared top bar. The landing page and the demo are separate routes, so there has to be a way
 * back and forth that is not the browser button. */
export function Nav({ cta = true }: { cta?: boolean }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft ring-1 ring-inset ring-indigo-200">
            <span className="h-2 w-2 rounded-full bg-brand" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            On-Call Support Agent
          </span>
        </Link>

        {cta ? (
          <Button href="/incidents">
            Try an incident
            <ArrowRight />
          </Button>
        ) : (
          <Link
            href="/"
            className="text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            ← How it works
          </Link>
        )}
      </div>
    </nav>
  );
}
