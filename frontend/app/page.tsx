import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Pipeline } from "@/components/Pipeline";
import { ArrowRight } from "@/components/ui";

/**
 * Landing page. Three blocks and nothing else: what this is, what the agents do, and where the
 * data came from.
 *
 * An earlier version ran the hero as two dense columns and then repeated all four agent names
 * in a section below the animation that already showed them. Pipeline now carries that
 * explanation, so the page reads top to bottom with each thing said once.
 */

const BUGS = [
  "A missing null check that only guest checkouts hit",
  "A cache with a TTL that no code path enforces",
  "An off-by-one that drops the last row of every batch",
  "A retry decorator dropped during a refactor",
  "A check-then-delete race on an unsynchronised cache",
  "A client reading a field a v3 API renamed",
  "A database timeout set below the normal query time",
  "An exception escaping a worker loop, crash-looping the pod",
];

const DATA = [
  { value: "5", label: "microservices", note: "checkout, payments, auth, inventory, notifications" },
  { value: "12", label: "Python files", note: "two of them deliberately clean, so the choice is real" },
  { value: "12", label: "alerts", note: "with the logs and deploy history around each one" },
  { value: "18", label: "past incidents", note: "the write ups the Remediation agent searches" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* -------------------------------------------------------------- hero */}
      <section className="hero-wash border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="rise mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-deep ring-1 ring-inset ring-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Four AI agents, one incident
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              On-Call Support Agent
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
              When a production service breaks, the engineer who gets paged spends the first ten
              to thirty minutes just working out{" "}
              <span className="font-medium text-ink">what broke and where</span>. I built four AI
              agents that do that part in about ten seconds. They read the logs and the recent
              deploys, name the file at fault, and suggest a fix based on how the team fixed
              something similar before.
            </p>

            <div className="mt-8 flex justify-center">
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
            </div>

            <p className="mt-5 text-sm text-ink-3">
              It only ever suggests. Nothing is run against any system.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- pipeline */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            What happens to one alert
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
            Each agent does one narrow job and hands on. Four small agents are easier to evaluate
            and fix than one big prompt, and the split matches how incident response is actually
            divided.
          </p>

          <div className="mt-7">
            <Pipeline />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- data */}
      <section>
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
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

          <div className="mt-8 rounded-xl border border-line bg-surface p-6">
            <h3 className="text-sm font-semibold text-ink">
              The eight bugs the agents have to find
            </h3>
            <p className="mt-1.5 text-sm text-ink-3">
              Each was planted on purpose, so the correct file and function is known before any
              agent runs.
            </p>
            <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {BUGS.map((bug) => (
                <li key={bug} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {bug}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-3">
              Ten of the twelve alerts quote a line of code in the error, so a plain text search
              finds the file without any AI at all. The other two name nothing, and need the code
              read. Those are the two worth watching.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
