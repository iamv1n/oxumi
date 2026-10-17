"use client";

import { useEffect, useState } from "react";

interface Beat {
  role: "agent" | "caller";
  text: string;
  // Fields the engine records once this line has been said.
  fields?: Record<string, string>;
}

const SCRIPT: Beat[] = [
  {
    role: "agent",
    text: "नमस्ते रमेश जी, Shakti Logistics की तरफ़ से automated assistant बोल रहा हूँ. अभी आप कहाँ पहुँचे हैं?",
  },
  {
    role: "caller",
    text: "Abhi Adilabad toll cross kiya hai.",
    fields: { current_location: "Adilabad toll" },
  },
  {
    role: "agent",
    text: "ठीक है. क्या आप रात नौ बजे तक Hyderabad पहुँच जाएँगे?",
  },
  {
    role: "caller",
    text: "Nahi, late hoga. Highway pe jam hai, barah baj jayenge.",
    fields: {
      on_schedule: "no",
      delay_reason: "traffic",
      revised_eta: "around midnight",
    },
  },
  { role: "agent", text: "समझ गया. गाड़ी या paperwork में कोई दिक्कत?" },
  {
    role: "caller",
    text: "Nahi, sab theek hai.",
    fields: { needs_help: "no" },
  },
  { role: "agent", text: "धन्यवाद, update record हो गया. Drive safe." },
];

const FIELDS = [
  "current_location",
  "on_schedule",
  "delay_reason",
  "revised_eta",
  "needs_help",
];

const WORD_MS = 85;
const PAUSE_TICKS = 7;
const RESTART_TICKS = 40;

const WORDS = SCRIPT.map((beat) => beat.text.split(" "));
// Tick at which each line starts being spoken.
const STARTS = WORDS.reduce<number[]>(
  (starts, words, i) => [
    ...starts,
    i === 0 ? 0 : starts[i - 1]! + WORDS[i - 1]!.length + PAUSE_TICKS,
  ],
  [],
);
const TOTAL = STARTS.at(-1)! + WORDS.at(-1)!.length + RESTART_TICKS;

export default function DemoCall() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setTick(TOTAL - 1), 0);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => setTick((t) => (t + 1) % TOTAL), WORD_MS);
    return () => clearInterval(id);
  }, []);

  const collected: Record<string, string> = {};
  const lines = SCRIPT.flatMap((beat, i) => {
    const shown = tick - STARTS[i]!;
    if (shown < 0) return [];
    const done = shown >= WORDS[i]!.length;
    if (done) Object.assign(collected, beat.fields);
    return [{ ...beat, text: WORDS[i]!.slice(0, shown + 1).join(" "), done }];
  });
  const speaking = lines.at(-1);

  return (
    <div className="glass grid overflow-hidden rounded-3xl md:grid-cols-[1.5fr_1fr]">
      <div className="flex min-h-[26rem] flex-col justify-end gap-3 p-6 sm:p-8">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex ${line.role === "caller" ? "justify-end" : ""}`}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                line.role === "caller"
                  ? "bg-white/10 text-zinc-100"
                  : "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 text-zinc-50"
              }`}
            >
              {line.text}
            </p>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2 text-xs text-zinc-500">
          <span className="flex h-4 items-end gap-0.5">
            {[0, 1, 2, 3].map((bar) => (
              <span
                key={bar}
                className={`w-0.5 rounded-full bg-amber-400 ${speaking && !speaking.done ? "bar" : "h-1"}`}
                style={{ animationDelay: `${bar * 120}ms` }}
              />
            ))}
          </span>
          {speaking && !speaking.done
            ? speaking.role === "agent"
              ? "Agent speaking"
              : "Driver speaking"
            : "Listening"}
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/30 p-6 sm:p-8 md:border-t-0 md:border-l">
        <p className="mb-5 text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
          Structured result
        </p>
        <dl className="space-y-4">
          {FIELDS.map((name) => (
            <div key={name}>
              <dt className="font-mono text-xs text-zinc-500">{name}</dt>
              <dd
                className={`mt-1 text-sm transition-all duration-500 ${
                  collected[name]
                    ? "translate-y-0 text-amber-200 opacity-100"
                    : "translate-y-1 text-zinc-700 opacity-60"
                }`}
              >
                {collected[name] ?? "waiting"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[11px] text-zinc-600">
          Illustrative call, scripted for this page.
        </p>
      </div>
    </div>
  );
}
