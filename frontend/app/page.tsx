import Link from "next/link";
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
  { value: "5", label: "microservices", note: "checkout, payments, auth, inventory, notifications" },
  { value: "12", label: "Python files", note: "two with no planted bug, so localization is a real choice" },
  { value: "12", label: "alerts", note: "each with its log window and deploy history" },
  { value: "18", label: "past incidents", note: "the corpus Remediation retrieves over" },
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
                ten to thirty minutes on{" "}
                <span className="font-medium text-ink">triage rather than the fix</span>: pulling
                the right logs, correlating the deploy, and searching an unfamiliar codebase. I
                built four AI agents that do that in about ten seconds.
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
            Root-causing one incident needs five kinds of data, all scoped to the same incident
            and the same time window. Assembling that by hand across five tools is what the first
            ten minutes of an on-call page actually goes on.
          </p>

          <div className="mt-6">
            <DataSources />
          </div>

          <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {DATA.map((d) => (
              <div key={d.label}>
                <dt className="font-mono text-2xl font-semibold tabular-nums text-brand">
                  {d.value}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">{d.label}</dd>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink-3">{d.note}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-7 max-w-3xl text-sm leading-relaxed text-ink-3">
            Ten of the twelve alerts carry a stack trace naming the failing file, which a regex
            over the logs resolves without any model at all. The other two carry none: an
            unbounded cache that raises nothing, and an off-by-one visible only as
            <span className="font-mono"> received=500 written=499</span>. Those two are where the
            agent has to read the source.
          </p>
        </div>
      </section>
    </div>
  );
}
