import { Nav } from "@/components/Nav";
import { PipelineAnimation } from "@/components/PipelineAnimation";
import { ArrowRight, Button, Card } from "@/components/ui";

/**
 * Landing page.
 *
 * The demo used to be the only page, so someone arriving cold met a list of alerts and had to
 * infer the point. This explains the problem, what was built, what data it runs on and why that
 * matters, then hands off to /incidents.
 */

const BY_HAND = [
  "Find the logs for the right service, in the right time window",
  "Work out which of the last few deploys caused it",
  "Search a codebase you may not have written",
  "Remember whether this has happened before, and what fixed it",
];

const WITH_AGENTS = [
  "Reads the logs and recent deploys for you",
  "Names the exact file and function at fault",
  "Suggests a fix, citing how the team fixed it last time",
  "Says how confident it is — and stops if it isn't",
];

const AGENTS = [
  {
    n: 1,
    name: "Triage",
    job: "Decides how serious it is and what kind of failure it is, from the symptoms alone.",
    detail:
      "One AI call, no tools. It never sees the answer — the alert's own category label is withheld, so the classification is real rather than a lookup.",
    tint: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  {
    n: 2,
    name: "Investigator",
    job: "Finds the file and function at fault, and says how confident it is.",
    detail:
      "Reads the logs and recent deploys, narrows the candidates, then reads their source to confirm the mechanism actually produces the symptom.",
    tint: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  {
    n: 3,
    name: "Remediation",
    job: "Suggests a fix, based on how the team fixed something similar before.",
    detail:
      "Searches past incident write-ups and must cite the ones it used. A citation naming something it did not retrieve is dropped automatically.",
    tint: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  {
    n: 4,
    name: "Reporter",
    job: "Writes the short summary an on-call engineer would paste into Slack.",
    detail:
      "Only reports what the earlier agents found. If nothing was located it says so, rather than hedging into an implied diagnosis.",
    tint: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
];

const DATA = [
  {
    value: "5",
    label: "services",
    note: "checkout, payments, auth, inventory, notifications — a made-up online shop",
  },
  {
    value: "8",
    label: "planted bugs",
    note: "a missing null check, an unbounded cache, an off-by-one, a dropped retry, and four more",
  },
  {
    value: "12",
    label: "alerts",
    note: "written around those bugs, so the correct answer is known before the agent runs",
  },
  {
    value: "18",
    label: "past incidents",
    note: "eight mirror the planted bugs, ten are near-misses so retrieval is not trivial",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="mt-[3px] h-4 w-4 shrink-0 text-emerald-600">
      <path
        d="M3 8.4 6.3 11.7 13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* -------------------------------------------------------------- hero */}
      <section className="hero-wash border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-deep ring-1 ring-inset ring-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Four AI agents, one incident
              </span>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                On-Call Support Agent
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-ink-2">
                When a production service breaks, the engineer who gets paged spends the first
                ten to thirty minutes not fixing anything — just working out{" "}
                <span className="font-medium text-ink">what broke and where</span>.
              </p>
              <p className="mt-3 text-lg leading-relaxed text-ink-2">
                This does that part in about ten seconds, and tells you how confident it is.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="/incidents" size="lg">
                  Try an incident
                  <ArrowRight />
                </Button>
                <Button href="#how" variant="secondary" size="lg">
                  How it works
                </Button>
              </div>

              <p className="mt-5 text-[13px] text-ink-3">
                It only ever suggests. Nothing is run against any system.
              </p>
            </div>

            <div className="rise d2">
              <PipelineAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- problem */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            The slow part isn&rsquo;t the fix
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
            Most of the time between a page going off and a fix going out is spent gathering
            context, under pressure, often by someone who did not write the service.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-base font-semibold text-ink">Doing it by hand</h3>
                <span className="font-mono text-lg font-semibold text-red-600">
                  10&ndash;30 min
                </span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {BY_HAND.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-indigo-200 bg-brand-soft/40 p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-base font-semibold text-ink">With these four agents</h3>
                <span className="font-mono text-lg font-semibold text-emerald-700">~10 sec</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {WITH_AGENTS.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ agents */}
      <section id="how" className="scroll-mt-8 border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            The four agents
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
            Each does one narrow job and hands on. Narrow agents are easier to evaluate and fix
            in isolation than one large prompt, and the split mirrors how incident response is
            actually divided.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {AGENTS.map((agent) => (
              <Card key={agent.name} className="p-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${agent.tint}`}
                  >
                    {agent.n}
                  </span>
                  <h3 className="text-base font-semibold text-ink">{agent.name}</h3>
                </div>
                <p className="mt-3.5 text-sm leading-relaxed text-ink">{agent.job}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{agent.detail}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-5 border-amber-200 bg-amber-50/60 p-6">
            <h3 className="text-base font-semibold text-ink">
              And a decision point in the middle
            </h3>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-ink-2">
              If the Investigator is less than 50% confident, the run stops and hands the
              incident to a human instead of suggesting a fix. A confident-sounding suggestion
              built on weak evidence is worse than no suggestion — because it gets acted on.
            </p>
          </Card>
        </div>
      </section>

      {/* -------------------------------------------------------------- data */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            The data is made up, on purpose
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
            No public dataset contains an alert, its logs, the deploy that caused it, the source
            code, and a write-up of a similar past incident. Real companies hold those in five
            different systems and nobody exports the join — so all of it was hand-written for
            this project.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DATA.map((d) => (
              <Card key={d.label} className="p-5">
                <p className="font-mono text-3xl font-semibold tabular-nums text-brand">
                  {d.value}
                </p>
                <p className="mt-1 text-sm font-medium text-ink">{d.label}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{d.note}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-5 p-6">
            <h3 className="text-base font-semibold text-ink">
              Why that is a feature, not a shortcut
            </h3>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-ink-2">
              Because each alert was written around a bug planted deliberately, the correct
              answer is known before the agent runs. That makes the accuracy figures checkable
              rather than impressive-sounding — and it let the difficulty be set on purpose. Ten
              of the twelve alerts quote a line of code in the error, so a plain text search finds
              the file with no AI at all. The other two name nothing, and need the code actually
              read.
            </p>
          </Card>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Pick something that broke, and watch it work
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-2">
            Twelve incidents across five services. Each run takes about ten seconds, and you see
            each agent report back as it finishes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/incidents" size="lg">
              Try an incident
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
