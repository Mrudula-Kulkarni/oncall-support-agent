import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PipelineAnimation } from "@/components/PipelineAnimation";
import { ArrowRight } from "@/components/ui";

/**
 * Landing page.
 *
 * Deliberately short. An earlier version explained everything twice over and the reader had to
 * wade; the demo is the thing worth reaching, so each section says its piece once and gets out
 * of the way.
 *
 * It opens incidents by naming three real ones rather than offering a generic button. A link
 * reading "Refunds have stopped processing" tells you what you are about to see; "View the
 * incidents" tells you nothing, and reads like a trial.
 */

const AGENTS = [
  { n: 1, name: "Triage", line: "Works out how serious it is, and what kind of failure it is, from the symptoms alone.", tint: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  { n: 2, name: "Investigator", line: "Reads the logs, the recent deploys and the source code to name the file at fault, and says how sure it is.", tint: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  { n: 3, name: "Remediation", line: "Suggests a fix, and cites the past incident it learned from.", tint: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { n: 4, name: "Reporter", line: "Writes the summary an on-call engineer would paste into Slack.", tint: "bg-amber-50 text-amber-700 ring-amber-600/20" },
];

/** Three with visibly different shapes — a crash, a slow leak, a bad release. */
const FEATURED = [
  { id: "alrt_006", title: "Refunds have stopped processing", service: "payment-service", hint: "every copy of the service is crash looping" },
  { id: "alrt_003", title: "Checkout slow, memory filling up", service: "checkout-service", hint: "no error and no stack trace, so the code has to be read" },
  { id: "alrt_010", title: "Reservations broken since the last deploy", service: "inventory-service", hint: "started six minutes after a release" },
];

const DATA = [
  { value: "5", label: "microservices", note: "checkout, payments, auth, inventory, notifications" },
  { value: "8", label: "planted bugs", note: "across 12 Python files, two of which are deliberately clean" },
  { value: "12", label: "alerts", note: "with the logs and deploy history around each" },
  { value: "18", label: "past incidents", note: "the write ups Remediation searches" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* -------------------------------------------------------------- hero */}
      <section className="hero-wash border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-deep ring-1 ring-inset ring-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Four AI agents, one incident
              </span>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                On-Call Support Agent
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-ink-2">
                When a production service breaks, the engineer who gets paged spends the first
                ten to thirty minutes not fixing anything. They are working out{" "}
                <span className="font-medium text-ink">what broke and where</span>. This does
                that part in about ten seconds, and tells you how sure it is.
              </p>

              <div className="mt-8">
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Watch it work on something broken
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  Twelve incidents across five microservices. Each takes about ten seconds, and
                  every agent reports back as it finishes rather than all at the end.
                </p>
                <div className="mt-4 space-y-2">
                  {FEATURED.map((item) => (
                    <Link
                      key={item.id}
                      href={`/incidents?alert=${item.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-all hover:border-brand hover:shadow-[0_1px_2px_rgba(79,70,229,0.08),0_8px_24px_-16px_rgba(79,70,229,0.4)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-0.5 text-sm text-ink-3">
                          <span className="font-mono">{item.service}</span> · {item.hint}
                        </p>
                      </div>
                      <span className="shrink-0 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:text-brand">
                        <ArrowRight />
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/incidents"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-deep"
                >
                  Or browse all twelve
                  <ArrowRight />
                </Link>
              </div>
            </div>

            <div className="rise d2 lg:pt-4">
              <PipelineAnimation />
              <p className="mt-3 text-sm text-ink-3">
                It only ever suggests. Nothing is run against any system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ agents */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-ink">The four agents</h2>
            <p className="text-sm text-ink-3">
              Four small agents are easier to evaluate and fix than one big prompt.
            </p>
          </div>

          <ol className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent) => (
              <li key={agent.name}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${agent.tint}`}>
                    {agent.n}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">{agent.name}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{agent.line}</p>
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-ink-2">
            <span className="font-medium text-ink">If the Investigator is under 50% confident</span>
            , the run stops and hands the incident to a human instead of suggesting a fix. A
            suggestion that sounds certain but rests on thin evidence is worse than no
            suggestion, because people act on it.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------- data */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Demo data</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
            Diagnosing an incident needs five things together: the alert, the logs around it,
            the deploy that caused it, the source code, and a write up of a similar past
            incident. Real companies keep those in five separate systems, and no public dataset
            joins them. So this runs on a purpose built set where the right answer is already
            known, which is what makes the results worth checking.
          </p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

    </div>
  );
}
