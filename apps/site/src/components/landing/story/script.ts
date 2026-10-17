// Turns a scenario and a tick counter into "what is on screen right now".

import type { Scenario } from "./scenarios";

export type { NodeKind } from "./scenarios";

export const TICK_MS = 95;

// Gaps, in ticks.
const LEAD_IN = 4;
const AFTER_AGENT = 6; // caller takes a breath
const AFTER_AGENT_CHAINED = 3; // agent continues with the next step
const AFTER_CALLER = 12; // answer is checked, next step is chosen
const LAND_DELAY = 2; // answer finished -> first value lands
const LAND_STAGGER = 5;
const ROUTE_DELAY = 5;
const HOLD = 44; // finished call stays on screen before the next one starts

interface Timeline {
  words: string[][];
  starts: number[];
  callEnd: number;
  outcomeAt: number;
  lastTick: number;
}

const cache = new Map<string, Timeline>();

function timeline(scenario: Scenario): Timeline {
  const cached = cache.get(scenario.id);
  if (cached) return cached;

  const words = scenario.beats.map((beat) => beat.text.split(" "));
  const starts: number[] = [];
  scenario.beats.forEach((beat, i) => {
    if (i === 0) return void starts.push(LEAD_IN);
    const prev = scenario.beats[i - 1]!;
    const gap = prev.cut
      ? 0
      : prev.role === "caller"
        ? AFTER_CALLER
        : beat.role === "agent"
          ? AFTER_AGENT_CHAINED
          : AFTER_AGENT;
    starts.push(starts[i - 1]! + words[i - 1]!.length + gap);
  });
  const callEnd = starts.at(-1)! + words.at(-1)!.length;
  const built = { words, starts, callEnd, outcomeAt: callEnd + 3, lastTick: callEnd + HOLD };
  cache.set(scenario.id, built);
  return built;
}

export const lastTick = (scenario: Scenario) => timeline(scenario).lastTick;

export interface Word {
  text: string;
  shown: boolean;
  // Part of a phrase a value was read from, once that value has been checked.
  mark: "ok" | "rejected" | null;
  // Field whose value is read starting at this word.
  anchor?: string;
}

export type Entry =
  | { type: "note"; text: string }
  | {
      type: "line";
      role: "agent" | "caller";
      step: string;
      cut: boolean;
      // The line has been said in full (or was cut off).
      done: boolean;
      words: Word[];
    };

export interface Value {
  value: string;
  state: "ok" | "rejected";
  reason?: string;
}

export type Status = "connecting" | "agent" | "caller" | "listening" | "checking" | "ended";

export interface Frame {
  entries: Entry[];
  values: Record<string, Value>;
  activeStep: string;
  status: Status;
  ended: boolean;
  outcome: boolean;
  elapsedSec: number;
}

export function frameAt(scenario: Scenario, tick: number): Frame {
  const { words, starts, callEnd, outcomeAt } = timeline(scenario);
  const values: Record<string, Value> = {};
  const entries: Entry[] = [];
  let activeStep = scenario.steps[0]!.id;
  let status: Status = "connecting";

  scenario.beats.forEach((beat, i) => {
    const said = tick - starts[i]!;
    if (said < 0) return;
    const end = starts[i]! + words[i]!.length;
    const done = tick >= end;
    const marks = new Map<number, "ok" | "rejected">();

    beat.captures?.forEach((capture, n) => {
      if (tick < end + LAND_DELAY + n * LAND_STAGGER) return;
      const state = capture.reject ? "rejected" : "ok";
      values[capture.field] = { value: capture.value, state, reason: capture.reject };
      for (let w = capture.from; w <= capture.to; w++) marks.set(w, state);
    });

    if (beat.note) entries.push({ type: "note", text: beat.note });
    entries.push({
      type: "line",
      role: beat.role,
      step: beat.step,
      cut: Boolean(beat.cut),
      done,
      words: words[i]!.map((text, w) => ({
        text,
        shown: w <= said,
        mark: marks.get(w) ?? null,
        anchor: beat.captures?.find((capture) => capture.from === w)?.field,
      })),
    });

    activeStep = beat.step;
    if (!done) {
      status = beat.role;
      return;
    }
    if (beat.role === "caller") {
      status = "checking";
      if (beat.route && tick >= end + ROUTE_DELAY) activeStep = beat.route;
    } else {
      // An agent line directly followed by another agent line is one turn.
      status = scenario.beats[i + 1]?.role === "agent" ? "agent" : "listening";
    }
  });

  const ended = tick >= callEnd;
  if (ended) status = "ended";

  return {
    entries,
    values,
    activeStep,
    status,
    ended,
    outcome: tick >= outcomeAt,
    elapsedSec: Math.floor((Math.min(tick, callEnd) * TICK_MS) / 1000),
  };
}
