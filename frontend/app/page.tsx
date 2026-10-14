import Link from "next/link";
import { Nav } from "@/components/Nav";
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
  { value: "12", label: "Python files", note: "two deliberately clean, so the choice is real" },
  { value: "12", label: "alerts", note: "with the logs and deploy history around each one" },
  { value: "18", label: "past incidents", note: "the write ups the Remediation agent searches" },
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
                ten to thirty minutes just working out{" "}
                <span className="font-medium text-ink">what broke and where</span>. I built four
                AI agents that do that part in about ten seconds.
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
                    <span className="block text-sm text-ink-3">and why it is synthesized</span>
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
            Diagnosing an incident needs five things together: the alert, the logs around it, the
            deploy that caused it, the source code, and a write up of a similar past incident.
            Real companies keep those in five separate systems, and no public dataset joins them.
            So this runs on a purpose built set where the right answer is already known, which is
            what makes the results worth checking.
          </p>

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

          <p className="mt-7 max-w-3xl border-t border-line pt-5 text-sm leading-relaxed text-ink-2">
            Eight bugs were planted in that code on purpose, so the correct file and function is
            known before any agent runs. Ten of the twelve alerts quote a line of code in the
            error, which a plain text search can find without any AI at all. The other two name
            nothing and need the code read. Those are the two worth watching.
          </p>
        </div>
      </section>
    </div>
  );
}
