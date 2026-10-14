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
    label: "microservices",
    note: "A fictional online shop: checkout, payments, auth, inventory and notifications — 12 Python files, including two with no bug in them so locating the right one is a real choice.",
  },
  {
    value: "8",
    label: "planted bugs",
    note: "A missing null check, a cache that never evicts, an off-by-one in a batch loop, a dropped retry decorator, a race condition, a renamed API field, and two more.",
  },
  {
    value: "12",
    label: "alerts",
    note: "With the logs and deploy history around each one. Four bugs get a second alert at a different volume, so severity has something to vary across.",
  },
  {
    value: "18",
    label: "past incidents",
    note: "Write-ups the Remediation agent searches. Eight mirror the planted bugs; ten are near-misses that share a category or service but not the cause.",
  },
];


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
                  View the incidents
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

          <Card tone="note" className="mt-5 p-6">
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
            The data is synthesized
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
            Diagnosing an incident needs five things joined together: the alert, the logs around
            it, the deploy that caused it, the source code, and a write-up of a similar past
            incident. Real companies keep those in five separate systems, and no public dataset
            joins them. So all of it was written by hand for this project.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-ink">What was built</h3>
              <dl className="mt-4 divide-y divide-line">
                {DATA.map((d) => (
                  <div key={d.label} className="flex gap-5 py-3 first:pt-0 last:pb-0">
                    <dt className="w-36 shrink-0 font-mono text-sm font-semibold text-ink">
                      {d.value} {d.label}
                    </dt>
                    <dd className="text-sm leading-relaxed text-ink-2">{d.note}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-ink">Why that makes it measurable</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Each alert was written around a bug planted deliberately, so the correct answer
                is known before the agent runs. The accuracy figures are checkable rather than
                asserted.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                It also let the difficulty be set on purpose. Ten of the twelve alerts quote a
                line of code in the error, so a plain text search finds the file with no AI at
                all. The other two name nothing and need the code read — those are the ones worth
                watching.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            See it work on a real incident
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-2">
            Twelve incidents across five microservices. Each takes about ten seconds, and you
            watch each agent report back as it finishes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/incidents" size="lg">
              View the incidents
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
