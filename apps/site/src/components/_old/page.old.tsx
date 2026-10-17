import Link from "next/link";
import DemoCall from "@/components/landing/DemoCall";
import FlowGraph from "@/components/landing/FlowGraph";
import OrbCanvas from "@/components/landing/OrbCanvas";
import Reveal from "@/components/landing/Reveal";

const USE_CASES = [
  {
    title: "Clinics",
    call: "OPD appointment confirmation",
    collects: ["Confirm, reschedule or cancel", "Preferred new slot", "Reason"],
    tone: "from-fuchsia-500/30",
  },
  {
    title: "Fleets",
    call: "Driver status check",
    collects: ["Current location", "On time or delayed", "Revised ETA", "Issues"],
    tone: "from-amber-500/30",
  },
  {
    title: "Real estate",
    call: "Lead qualification",
    collects: ["Budget", "Locality", "Timeline", "Site-visit slot"],
    tone: "from-violet-500/30",
  },
  {
    title: "Support desks",
    call: "First-line triage",
    collects: ["Issue category", "Order reference", "Urgency", "Callback consent"],
    tone: "from-sky-500/30",
  },
];

const PRINCIPLES = [
  {
    title: "The flow decides. The model speaks.",
    body: "A deterministic engine owns which question comes next and when the call is done. The language model only words the reply and proposes values, and every value is validated before it is kept.",
  },
  {
    title: "Interrupt it like a person.",
    body: "Speech is streamed in both directions. When the caller talks over the agent, it stops mid-word, listens, and answers what was actually said.",
  },
  {
    title: "Hindi, English, and the mix in between.",
    body: "The agent follows the caller's language turn by turn, including the code-switching most real calls in India are made of.",
  },
  {
    title: "Every turn is traced.",
    body: "Time to first word and first audio is recorded for each reply, next to the transcript and the step the flow was on. Slow turns are visible, not anecdotal.",
  },
];

const STAGES = [
  { label: "Caller stops speaking", width: "w-[8%]", tone: "bg-zinc-600" },
  { label: "Transcript final", width: "w-[22%]", tone: "bg-violet-500" },
  { label: "First word from the model", width: "w-[38%]", tone: "bg-fuchsia-500" },
  { label: "First audio out", width: "w-[32%]", tone: "bg-amber-400" },
];

const MARQUEE = [
  "Appointment reminders",
  "Driver check-ins",
  "Lead qualification",
  "Payment follow-ups",
  "Delivery confirmation",
  "Feedback calls",
  "Order status",
  "Admission enquiries",
];

export default function Landing() {
  return (
    <div className="landing relative overflow-x-clip bg-[#07070a] text-zinc-300">
      <nav className="fixed inset-x-0 top-0 z-30 flex justify-center px-4 pt-4">
        <div className="glass flex w-full max-w-5xl items-center gap-6 rounded-full px-5 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-semibold text-zinc-50">
            <span className="size-2.5 rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-500" />
            Oxumi
          </span>
          <a href="#how" className="ml-auto hidden text-zinc-400 hover:text-zinc-100 sm:block">
            How it works
          </a>
          <a href="#use-cases" className="hidden text-zinc-400 hover:text-zinc-100 sm:block">
            Use cases
          </a>
          <Link
            href="/console"
            className="ml-auto rounded-full bg-zinc-50 px-4 py-1.5 font-medium text-zinc-950 transition hover:bg-white sm:ml-0"
          >
            Open console
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative flex min-h-svh flex-col items-center justify-end px-6 pb-20 text-center">
        <OrbCanvas />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#07070a]" />
        <div className="relative z-10 max-w-4xl">
          <p className="rise mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
            हिन्दी · English · Hinglish
          </p>
          <h1 className="rise font-display text-6xl leading-[0.95] tracking-tight text-zinc-50 [animation-delay:120ms] sm:text-8xl">
            Design the call.
            <br />
            <span className="shimmer italic">The agent makes it.</span>
          </h1>
          <p className="rise mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400 [animation-delay:240ms]">
            Draw a phone conversation as a flow. A voice agent runs it with
            real people and hands back structured answers, not just a
            transcript.
          </p>
          <div className="rise mt-9 flex flex-wrap justify-center gap-3 [animation-delay:360ms]">
            <Link
              href="/console"
              className="group rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-500 p-px"
            >
              <span className="block rounded-full bg-zinc-950 px-6 py-3 font-medium text-zinc-50 transition group-hover:bg-zinc-950/60">
                Try a test call →
              </span>
            </Link>
            <a
              href="#how"
              className="rounded-full border border-white/15 px-6 py-3 font-medium text-zinc-200 transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
        </div>
      </header>

      {/* Marquee */}
      <div className="relative border-y border-white/5 py-5 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <div className="marquee flex w-max gap-10 text-sm whitespace-nowrap text-zinc-500">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-10">
              {item}
              <span className="size-1 rounded-full bg-zinc-700" />
            </span>
          ))}
        </div>
      </div>

      {/* Demo */}
      <section className="mx-auto max-w-5xl px-6 py-28">
        <Reveal>
          <p className="eyebrow">A call, start to finish</p>
          <h2 className="heading">
            It sounds like a conversation.
            <br />
            <span className="text-zinc-500">It lands as data.</span>
          </h2>
        </Reveal>
        <Reveal delay={150} className="mt-12">
          <DemoCall />
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-28">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="heading">A flow, not a prompt.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
            You decide what gets asked, in what order, and what happens when
            the answer changes the path. The agent handles the talking.
          </p>
        </Reveal>
        <Reveal delay={150} className="mt-12">
          <FlowGraph />
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["01", "Design", "Lay out steps and branches, and say what each step must collect."],
            ["02", "Call", "Test in the browser, then point the same flow at a phone number."],
            ["03", "Collect", "Every call ends in validated fields and a clear outcome."],
          ].map(([step, title, body], i) => (
            <Reveal key={step} delay={i * 120}>
              <div className="glass h-full rounded-2xl p-6">
                <p className="font-mono text-xs text-amber-300">{step}</p>
                <h3 className="mt-3 text-xl font-medium text-zinc-50">{title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-28">
        <Reveal>
          <p className="eyebrow">Use cases</p>
          <h2 className="heading">
            One engine.
            <br />
            <span className="text-zinc-500">Whatever your calls are about.</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {USE_CASES.map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <article className="card group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-7">
                <div
                  className={`absolute -top-24 -right-24 size-64 rounded-full bg-gradient-to-br ${item.tone} to-transparent opacity-40 blur-3xl transition duration-700 group-hover:scale-150 group-hover:opacity-80`}
                />
                <div className="relative">
                  <h3 className="font-display text-4xl text-zinc-50">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{item.call}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {item.collects.map((field) => (
                      <li
                        key={field}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-5xl px-6 py-28">
        <Reveal>
          <p className="eyebrow">Built differently</p>
          <h2 className="heading">Reliable by construction.</h2>
        </Reveal>
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {PRINCIPLES.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 120}>
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-medium text-zinc-50">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-zinc-400">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16">
          <div className="glass rounded-3xl p-7">
            <p className="text-sm text-zinc-400">
              What gets timed on every reply
            </p>
            <div className="trace mt-5 flex h-3 overflow-hidden rounded-full bg-white/5">
              {STAGES.map((stage) => (
                <span key={stage.label} className={`${stage.width} ${stage.tone}`} />
              ))}
            </div>
            <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              {STAGES.map((stage) => (
                <li key={stage.label} className="flex items-center gap-2 text-zinc-300">
                  <span className={`size-2 rounded-full ${stage.tone}`} />
                  {stage.label}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-zinc-600">
              Bar is a diagram of the stages, not a measurement.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="relative px-6 py-36 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto size-[36rem] max-w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500/20 via-fuchsia-500/20 to-violet-500/20 blur-3xl" />
        <Reveal className="relative">
          <h2 className="font-display text-5xl leading-none text-zinc-50 sm:text-7xl">
            Hear it <span className="shimmer italic">for yourself.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-zinc-400">
            Pick a flow, play the person being called, and watch the answers
            fill in.
          </p>
          <Link
            href="/console"
            className="mt-9 inline-block rounded-full bg-zinc-50 px-7 py-3.5 font-medium text-zinc-950 transition hover:scale-[1.03] hover:bg-white"
          >
            Open the console
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        Oxumi · early build
      </footer>
    </div>
  );
}
