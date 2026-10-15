import Link from "next/link";
import { Accuracy } from "@/components/Accuracy";
import { Nav } from "@/components/Nav";
import { DataSources } from "@/components/DataSources";
import { Pipeline } from "@/components/Pipeline";
import { ArrowRight } from "@/components/ui";

/**
 * Landing page: the hero, then the data.
 *
 * The pipeline sits beside the opening paragraph rather than in a section below it, because
 * nobody scrolls to find out what the agents do. It also carries their descriptions, which
 * means there is no separate "four agents" section repeating the same four names.
 */

const DATA = [
  {
    value: "5",
    label: "microservices",
    note: "Checkout, payments, auth, inventory and notifications, each with its own logs and release history.",
  },
  {
    value: "12",
    label: "Python files",
    note: "Eight have a bug planted on purpose. Two are clean, so the agent has to pick the right one.",
  },
  {
    value: "12",
    label: "alerts",
    note: "Each comes with the logs and releases around it. Four bugs show up twice, at different severities.",
  },
  {
    value: "18",
    label: "past incidents",
    note: "Eight match a planted bug. The other ten are near misses, so the search has to tell them apart.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* -------------------------------------------------------------- hero */}
      <section className="hero-wash border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_26rem] lg:gap-16">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-deep ring-1 ring-inset ring-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Four AI agents, one incident
              </span>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                On-Call Support Agent
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
                When a production service breaks, the engineer who gets paged spends the first
                ten to thirty minutes{" "}
                <span className="font-medium text-ink">before they can even start fixing it</span>
                : finding the right logs, working out which release caused it, and searching a
                codebase they may not have written. I built four AI agents that do that part in
                about ten seconds.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/incidents"
                  className="group inline-flex items-center justify-between gap-6 rounded-xl bg-brand px-6 py-4 text-left text-white transition-colors hover:bg-brand-deep"
                >
                  <span>
                    <span className="block text-base font-semibold">Go to incidents</span>
                    <span className="block text-sm text-indigo-200">12 across 5 services</span>
                  </span>
                  <span className="transition-transform group-hover:translate-x-0.5">
                    <ArrowRight />
                  </span>
                </Link>

                <a
                  href="#data"
                  className="inline-flex items-center justify-between gap-6 rounded-xl border border-line-strong bg-surface px-6 py-4 text-left text-ink transition-colors hover:bg-surface-2"
                >
                  <span>
                    <span className="block text-base font-semibold">See the demo data</span>
                    <span className="block text-sm text-ink-3">and why it is synthetic</span>
                  </span>
                </a>
              </div>

              <p className="mt-5 text-sm text-ink-3">
                It only ever suggests. Nothing is run against any system.
              </p>
            </div>

            <div className="rise d2">
              <Pipeline />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- data */}
      <section id="data" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Demo data</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
            Diagnosing one incident needs five kinds of data, all about that same incident.
            Pulling them together by hand is what the first ten minutes of a page goes on.
          </p>

          <div className="mt-6">
            <DataSources />
          </div>

          <dl className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {DATA.map((d) => (
              <div key={d.label}>
                <dt className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-brand">
                    {d.value}
                  </span>
                  <span className="text-sm font-medium text-ink">{d.label}</span>
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">{d.note}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-7 max-w-3xl text-sm leading-relaxed text-ink-3">
            Ten of the twelve alerts include an error message naming the file that failed, which
            a plain text search finds without any AI at all. The other two do not: a cache that
            grows forever without clearing, and a loop that quietly skips one row in every batch.
            Those two are where the agent has to read the code to work it out.
          </p>

          <div className="mt-10">
            <Accuracy />
          </div>
        </div>
      </section>
    </div>
  );
}
