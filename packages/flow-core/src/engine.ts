import {
  type AskNode,
  type Condition,
  type Field,
  type Flow,
  type FlowNode,
  type Outcome,
  renderTemplate,
} from "./schema";

// The engine is pure and deterministic. The LLM words the replies and proposes
// field values; this module alone decides which node is active, whether a
// value is acceptable and when the call is over.

export type FieldValue = string | number | boolean;

export const SIGNALS = [
  "none",
  "callback_later",
  "wrong_person",
  "opt_out",
  // The caller asked for a person. Acted on only when the flow has a
  // hand-off number; otherwise the call carries on.
  "human",
  // No person answered: a network recording ("the number you have dialled
  // is busy") or voicemail.
  "not_reached",
] as const;
export type Signal = (typeof SIGNALS)[number];

const SIGNAL_OUTCOME: Record<Exclude<Signal, "none" | "human">, Outcome> = {
  callback_later: "callback_requested",
  wrong_person: "wrong_person",
  opt_out: "opted_out",
  not_reached: "failed",
};

export interface CallState {
  nodeId: string;
  fields: Record<string, FieldValue>;
  attempts: Record<string, number>;
  path: string[];
  // Ask nodes left behind with required fields still missing.
  skipped: string[];
  ended: boolean;
  outcome?: Outcome;
  // Set while the call is being handed to a person. `to` may still hold a
  // {{variable}}; the runtime fills it in. If the transfer cannot be made,
  // resumeAfterTransfer carries on at `resumeAt`.
  transfer?: {
    to: string;
    reason: "step" | "requested";
    resumeAt: string;
  };
}

export interface TurnResult {
  state: CallState;
  accepted: Record<string, FieldValue>;
  rejected: { field: string; reason: string }[];
}

const MAX_STEPS = 200;

function nodeMap(flow: Flow): Map<string, FlowNode> {
  return new Map(flow.nodes.map((n) => [n.id, n]));
}

function getNode(flow: Flow, id: string): FlowNode {
  const node = nodeMap(flow).get(id);
  if (!node) throw new Error(`Flow "${flow.id}" has no node "${id}".`);
  return node;
}

export function evaluate(
  cond: Condition,
  fields: Record<string, FieldValue>,
): boolean {
  const value = fields[cond.field];
  switch (cond.op) {
    case "known":
      return value !== undefined;
    case "eq":
      return value !== undefined && value === cond.value;
    case "neq":
      return value !== cond.value;
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(String(value));
  }
}

export function missingFields(
  flow: Flow,
  node: AskNode,
  fields: Record<string, FieldValue>,
): Field[] {
  return node.fields
    .map((name) => flow.fields.find((f) => f.name === name)!)
    .filter((f) => f.required && fields[f.name] === undefined);
}

export function coerce(
  field: Field,
  raw: unknown,
): { ok: true; value: FieldValue } | { ok: false; reason: string } {
  switch (field.type) {
    case "string": {
      const text = typeof raw === "string" ? raw.trim() : "";
      return text
        ? { ok: true, value: text }
        : { ok: false, reason: "expected non-empty text" };
    }
    case "number": {
      const n = typeof raw === "string" ? Number(raw.trim()) : raw;
      return typeof n === "number" && Number.isFinite(n)
        ? { ok: true, value: n }
        : { ok: false, reason: "expected a number" };
    }
    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      const text = String(raw).trim().toLowerCase();
      if (["true", "yes"].includes(text)) return { ok: true, value: true };
      if (["false", "no"].includes(text)) return { ok: true, value: false };
      return { ok: false, reason: "expected yes or no" };
    }
    case "enum": {
      const text = String(raw).trim().toLowerCase();
      const option = field.options?.find((o) => o.toLowerCase() === text);
      return option
        ? { ok: true, value: option }
        : {
            ok: false,
            reason: `expected one of: ${field.options?.join(", ")}`,
          };
    }
  }
}

// Walks forward through nodes that need no caller input, stopping at an ask
// node that still has something to collect, or at an end node.
function settle(flow: Flow, state: CallState): void {
  for (let step = 0; step < MAX_STEPS; step++) {
    const node = getNode(flow, state.nodeId);
    if (state.path.at(-1) !== node.id) state.path.push(node.id);
    switch (node.type) {
      case "start":
      case "say":
        state.nodeId = node.next;
        break;
      case "branch":
        state.nodeId =
          node.branches.find((b) => evaluate(b.when, state.fields))?.next ??
          node.default;
        break;
      case "ask":
        if (missingFields(flow, node, state.fields).length) return;
        state.nodeId = node.next;
        break;
      case "transfer":
        state.ended = true;
        state.outcome = "transferred";
        state.transfer = { to: node.to, reason: "step", resumeAt: node.next };
        return;
      case "end":
        state.ended = true;
        state.outcome =
          node.outcome === "completed" && state.skipped.length
            ? "partial"
            : node.outcome;
        return;
    }
  }
  throw new Error(`Flow "${flow.id}" loops without asking the caller anything.`);
}

export function startCall(flow: Flow): CallState {
  const state: CallState = {
    nodeId: flow.start,
    fields: {},
    attempts: {},
    path: [],
    skipped: [],
    ended: false,
  };
  settle(flow, state);
  return state;
}

export function applyTurn(
  flow: Flow,
  previous: CallState,
  proposed: Record<string, unknown>,
  signal: Signal = "none",
): TurnResult {
  const state = structuredClone(previous);
  const accepted: Record<string, FieldValue> = {};
  const rejected: { field: string; reason: string }[] = [];
  if (state.ended) return { state, accepted, rejected };

  for (const [name, raw] of Object.entries(proposed)) {
    if (raw === null || raw === undefined) continue;
    const field = flow.fields.find((f) => f.name === name);
    if (!field) {
      rejected.push({ field: name, reason: "unknown field" });
      continue;
    }
    const result = coerce(field, raw);
    if (result.ok) accepted[name] = state.fields[name] = result.value;
    else rejected.push({ field: name, reason: result.reason });
  }

  const handoff = flow.settings.handoff?.to;
  if (signal === "human" && handoff) {
    state.ended = true;
    state.outcome = "transferred";
    state.transfer = { to: handoff, reason: "requested", resumeAt: state.nodeId };
    return { state, accepted, rejected };
  }
  if (signal !== "none" && signal !== "human") {
    state.ended = true;
    state.outcome = SIGNAL_OUTCOME[signal];
    return { state, accepted, rejected };
  }

  const node = getNode(flow, state.nodeId);
  if (node.type === "ask" && missingFields(flow, node, state.fields).length) {
    const attempts = (state.attempts[node.id] ?? 0) + 1;
    state.attempts[node.id] = attempts;
    const limit = node.maxAttempts ?? flow.settings.maxAttempts;
    if (attempts < limit) return { state, accepted, rejected };
    state.skipped.push(node.id);
    state.nodeId = node.next;
  }
  settle(flow, state);
  return { state, accepted, rejected };
}

// The transfer could not be made: the call carries on where it would have
// gone next, as if the transfer step had been passed.
export function resumeAfterTransfer(flow: Flow, previous: CallState): CallState {
  if (!previous.transfer) return previous;
  const state = structuredClone(previous);
  state.nodeId = state.transfer!.resumeAt;
  state.ended = false;
  delete state.outcome;
  delete state.transfer;
  settle(flow, state);
  return state;
}

// What the person taking over is told before the caller is put through:
// what the call was about and what has been collected so far.
export function handoffSummary(
  flow: Flow,
  state: CallState,
  variables: Record<string, string>,
): string {
  const known = flow.fields
    .filter((field) => state.fields[field.name] !== undefined)
    .map((field) => `${field.description}: ${String(state.fields[field.name])}`);
  const who = Object.entries(variables)
    .slice(0, 3)
    .map(([name, value]) => `${name.replace(/_/g, " ")} ${value}`);
  return [
    `Transferred call from the ${flow.name} agent.`,
    state.transfer?.reason === "requested" ? "The caller asked to speak to a person." : "",
    who.length ? `About: ${who.join(", ")}.` : "",
    known.length ? `So far: ${known.join("; ")}.` : "Nothing has been collected yet.",
  ]
    .filter(Boolean)
    .join(" ");
}

function describeField(field: Field): string {
  const kind =
    field.type === "enum"
      ? `one of: ${field.options!.join(", ")}`
      : field.type === "boolean"
        ? "yes/no"
        : field.type === "number"
          ? "number"
          : "text";
  return `${field.name} (${kind}): ${field.description}`;
}

function describeCondition(cond: Condition): string {
  switch (cond.op) {
    case "known":
      return `${cond.field} is known`;
    case "eq":
      return `${cond.field} is ${JSON.stringify(cond.value)}`;
    case "neq":
      return `${cond.field} is not ${JSON.stringify(cond.value)}`;
    case "in":
      return `${cond.field} is one of ${JSON.stringify(cond.value)}`;
  }
}

function describeAsk(
  flow: Flow,
  node: AskNode,
  state: CallState,
  variables: Record<string, string>,
): string[] {
  const lines = node.fields
    .filter((name) => state.fields[name] === undefined)
    .map((name) => `- ${describeField(flow.fields.find((f) => f.name === name)!)}`);
  if (node.guidance)
    lines.push(`Guidance: ${renderTemplate(node.guidance, variables)}`);
  return lines;
}

// What the agent should do once the current step is satisfied. Branches whose
// inputs are already known are resolved here; the rest are spelled out so the
// model can continue in the same breath as the engine will.
function describeFrom(
  flow: Flow,
  id: string,
  state: CallState,
  variables: Record<string, string>,
  indent: string,
  seen: Set<string>,
): string[] {
  if (seen.has(id)) return [`${indent}(continues at an earlier step)`];
  const node = getNode(flow, id);
  const visited = new Set(seen).add(id);
  const more = (next: string, pad = indent) =>
    describeFrom(flow, next, state, variables, pad, visited);
  switch (node.type) {
    case "start":
    case "say":
      return [
        `${indent}Say: "${renderTemplate(node.say, variables)}"`,
        ...more(node.next),
      ];
    case "ask":
      if (!missingFields(flow, node, state.fields).length)
        return more(node.next);
      return [
        `${indent}Ask for:`,
        ...describeAsk(flow, node, state, variables).map((l) => `${indent}  ${l}`),
      ];
    case "branch": {
      const fieldsUsed = node.branches.map((b) => b.when.field);
      if (fieldsUsed.every((f) => state.fields[f] !== undefined)) {
        const hit = node.branches.find((b) => evaluate(b.when, state.fields));
        return more(hit?.next ?? node.default);
      }
      return [
        ...node.branches.flatMap((b) => [
          `${indent}If ${describeCondition(b.when)}:`,
          ...more(b.next, `${indent}  `),
        ]),
        `${indent}Otherwise:`,
        ...more(node.default, `${indent}  `),
      ];
    }
    case "transfer":
      return [
        `${indent}Say: "${renderTemplate(node.say, variables)}" The call is then handed to a person; do not say goodbye.`,
      ];
    case "end":
      return [
        `${indent}Close the call by saying: "${renderTemplate(node.say, variables)}"`,
      ];
  }
}

// The per-turn brief handed to the LLM alongside what the caller said.
export function describeState(
  flow: Flow,
  state: CallState,
  variables: Record<string, string>,
): string {
  const collected = Object.keys(state.fields).length
    ? JSON.stringify(state.fields)
    : "nothing yet";
  const lines = [`Collected so far: ${collected}`];
  if (state.ended && state.transfer) {
    lines.push(
      state.transfer.reason === "requested"
        ? "The caller is being put through to a person. Say one short line telling them you are connecting them now. Do not say goodbye."
        : "The caller is being put through to a person. If you have not already said the transfer line, say it now in one short sentence. Do not say goodbye.",
    );
    return lines.join("\n");
  }
  if (state.ended) {
    lines.push(
      `The call flow has ended (outcome: ${state.outcome}). Say one short goodbye if you have not already.`,
    );
    return lines.join("\n");
  }
  const node = getNode(flow, state.nodeId) as AskNode;
  const attempt = (state.attempts[node.id] ?? 0) + 1;
  const limit = node.maxAttempts ?? flow.settings.maxAttempts;
  lines.push(
    `Current step "${node.id}" (attempt ${attempt} of ${limit}) - collect:`,
    ...describeAsk(flow, node, state, variables),
    "Once every value for this step is captured, continue in the same reply with:",
    ...describeFrom(flow, node.next, state, variables, "  ", new Set([node.id])),
  );
  return lines.join("\n");
}

export function openingLines(
  flow: Flow,
  variables: Record<string, string>,
): string[] {
  const lines: string[] = [];
  let node = getNode(flow, flow.start);
  for (let step = 0; step < MAX_STEPS; step++) {
    if (node.type !== "start" && node.type !== "say") break;
    lines.push(renderTemplate(node.say, variables));
    node = getNode(flow, node.next);
  }
  return lines;
}
