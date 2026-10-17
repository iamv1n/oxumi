"use client";

import type { CallState, DraftFlow } from "@oxumi/flow-core";
import { useCallback, useEffect, useState } from "react";
import {
  type AgentDetail,
  ApiError,
  type CallDetail,
  type Credential,
  type Health,
  placePhoneCall,
  refreshCalls,
  useCall,
} from "@/lib/api";
import { type ConsoleState, initialState, type Line } from "./state";

// A real phone call placed with the agent. The audio is on the phone line,
// not in this browser, so there is no socket: the console follows the saved
// call record instead and shows it through the same view as a browser call.

const POLL_MS = 2000;
const NUMBER_KEY = "oxumi:test-console-phone";

// ---- The number to dial -------------------------------------------------------

// Spaces, dashes, dots and brackets are fine to type; the API wants none.
export const normalizeNumber = (raw: string): string => raw.replace(/[\s().-]/g, "");
// International format: "+", country code, 8 to 15 digits in all.
export const isPhoneNumber = (raw: string): boolean =>
  /^\+[1-9]\d{7,14}$/.test(normalizeNumber(raw));

export function recallNumber(): string {
  try {
    return localStorage.getItem(NUMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberNumber(to: string): void {
  try {
    localStorage.setItem(NUMBER_KEY, to);
  } catch {
    // Private mode: the number is simply not remembered.
  }
}

// ---- Readiness ----------------------------------------------------------------

const TELEPHONY_LABEL: Record<string, string> = {
  twilio: "Twilio",
  exotel: "Exotel",
  vobiz: "Vobiz",
};
export const telephonyLabel = (id: string): string => TELEPHONY_LABEL[id] ?? id;

export interface PhoneBlocker {
  reason: string;
  // Where the fix is made, when it is something the user can do in the app.
  fix: "flow" | "integrations" | "config" | null;
}

// Why a phone call cannot be placed, or null when it can.
export function phoneBlocker(
  agent: Pick<AgentDetail, "ready" | "telephony">,
  health: Health | undefined,
): PhoneBlocker | null {
  if (!agent.ready) return { reason: "Fix the flow before placing a call.", fix: "flow" };
  if (!health) return { reason: "Checking whether phone calls are set up…", fix: null };
  const { phone } = health;
  if (agent.telephony && !phone.providers.includes(agent.telephony))
    return {
      reason: `This agent calls through ${telephonyLabel(agent.telephony)}, which is not connected or is missing details.`,
      fix: "integrations",
    };
  if (!phone.providers.length)
    return {
      reason: "No telephony provider is connected. Connect Twilio, Exotel or Vobiz under Integrations.",
      fix: "integrations",
    };
  if (!health.voice)
    return {
      reason:
        "No speech provider is connected. Connect ElevenLabs or Sarvam under Integrations.",
      fix: "integrations",
    };
  if (!phone.serverReachable)
    return {
      reason:
        "This server has no public URL, so the telephony provider cannot reach it. Whoever runs the server has to set one.",
      fix: null,
    };
  if (!phone.ready)
    return { reason: "Phone calls are not set up for this project yet.", fix: "integrations" };
  return null;
}

// The provider and number a call will come from.
export function phoneFrom(
  agent: Pick<AgentDetail, "telephony" | "phoneNumber">,
  health: Health | undefined,
  credentials: Credential[] | undefined,
): { provider: string; label: string; number: string | null } | null {
  const provider = agent.telephony || health?.phone.providers[0];
  if (!provider) return null;
  const saved = credentials?.find((c) => c.provider === provider);
  // Each provider has its own name for its default calling number.
  const fallback = saved?.options.fromNumber || saved?.options.callerId || null;
  return {
    provider,
    label: telephonyLabel(provider),
    number: agent.phoneNumber || fallback,
  };
}

// ---- Call record -> console state --------------------------------------------

// The steps passed through on the way from one resting step to the next
// (branches, and lines the agent just says), found by walking the flow.
function between(flow: DraftFlow, from: string, to: string): string[] {
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const exits = (id: string): string[] => {
    const node = nodes.get(id);
    if (!node) return [];
    if (node.type === "branch") return [...node.branches.map((b) => b.next), node.default];
    return node.type === "end" ? [] : [node.next];
  };
  let trails: string[][] = exits(from).map((id) => [id]);
  for (let depth = 0; depth < 8 && trails.length; depth++) {
    const found = trails.find((trail) => trail.at(-1) === to);
    if (found) return found.slice(0, -1);
    trails = trails.flatMap((trail) => {
      const node = nodes.get(trail.at(-1)!);
      // Only steps that do not wait for the caller can be passed through.
      if (!node || node.type === "ask" || node.type === "end") return [];
      return exits(node.id).map((id) => [...trail, id]);
    });
  }
  return [];
}

function pathOf(call: CallDetail, flow: DraftFlow): string[] {
  const path: string[] = [];
  const visit = (id: string) => {
    if (path.at(-1) !== id) path.push(id);
  };
  let at = flow.start;
  visit(at);
  for (const turn of call.turns) {
    if (turn.nodeId === at) continue;
    between(flow, at, turn.nodeId).forEach(visit);
    visit(turn.nodeId);
    at = turn.nodeId;
  }
  return path;
}

// What the console shows for a phone call, from its saved record. Turns are
// saved as each one completes, so the transcript grows turn by turn.
export function fromCallRecord(call: CallDetail, flow: DraftFlow): ConsoleState {
  const lines: Line[] = [];
  // The hand-off goes where it happened: a failed one is followed by more turns.
  const handoff = call.handoff;
  let handedOff = false;
  const pushHandoff = () => {
    if (!handoff || handedOff) return;
    handedOff = true;
    const { to, summary, status, error } = handoff;
    lines.push({
      id: lines.length,
      role: "transfer",
      text: summary,
      transfer: { to, summary, status, error },
    });
  };
  for (const turn of call.turns) {
    if (handoff && +new Date(turn.createdAt) > +new Date(handoff.at)) pushHandoff();
    if (turn.callerText)
      lines.push({ id: lines.length, role: "caller", text: turn.callerText });
    lines.push({
      id: lines.length,
      role: "agent",
      text: turn.agentText,
      turn: turn.index,
      interrupted: turn.interrupted,
    });
  }
  pushHandoff();
  const ended = call.status === "ended";
  const last = call.turns.at(-1);
  const progress: CallState | null = last
    ? {
        nodeId: last.nodeId,
        path: pathOf(call, flow),
        fields: call.fields,
        attempts: {},
        skipped: [],
        // Only a call that reached an end step finished its flow.
        ended: flow.nodes.find((node) => node.id === last.nodeId)?.type === "end",
      }
    : null;
  return {
    ...initialState,
    status: ended ? "ended" : call.status === "in_progress" ? "live" : "connecting",
    mode: "phone",
    model: call.model,
    callId: call.id,
    lines,
    phase: "listening",
    call: progress,
    timings: call.turns.map((turn) => ({
      turn: turn.index,
      llmMs: turn.llmMs,
      audioMs: turn.audioMs,
      interrupted: turn.interrupted,
    })),
    result: ended && call.outcome ? { outcome: call.outcome, fields: call.fields } : null,
    error: call.error,
    endReason: ended ? (call.error ? "error" : "finished") : null,
    startedAt: +new Date(call.startedAt),
    endedAt: call.endedAt ? +new Date(call.endedAt) : null,
    phone: { to: call.to ?? "", stage: call.status, telephony: call.telephony },
  };
}

// Before the record exists: the request to place the call is in flight.
export const placingState = (to: string): ConsoleState => ({
  ...initialState,
  status: "connecting",
  mode: "phone",
  phone: { to, stage: "placing", telephony: null },
});

// The server refused to place the call; its message says what is missing.
export const refusedState = (to: string, message: string, at: number): ConsoleState => ({
  ...initialState,
  status: "ended",
  mode: "phone",
  error: message,
  endReason: "error",
  endedAt: at,
  phone: { to, stage: "ended", telephony: null },
});

// ---- Placing and following a call ----------------------------------------------

type Session =
  | { step: "placing"; to: string }
  | { step: "refused"; to: string; message: string; at: number }
  | { step: "placed"; to: string; callId: string };

// Places phone calls for one agent and follows the latest one. `state` is
// null until a call has been attempted.
export function usePhoneCall(agent: AgentDetail | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const callId = session?.step === "placed" ? session.callId : undefined;
  const { data: record, mutate } = useCall(callId);
  const over = record?.status === "ended";

  // The record is the only window onto the call: re-read it while it runs.
  useEffect(() => {
    if (!callId || over) return;
    const id = setInterval(() => void mutate(), POLL_MS);
    return () => clearInterval(id);
  }, [callId, over, mutate]);

  const projectId = agent?.projectId;
  useEffect(() => {
    if (over && projectId) void refreshCalls(projectId);
  }, [over, projectId]);

  const place = useCallback(
    async (rawTo: string, variables: Record<string, string>) => {
      if (!agent) return;
      const to = normalizeNumber(rawTo);
      setSession({ step: "placing", to });
      try {
        const call = await placePhoneCall(agent, { to, variables });
        rememberNumber(to);
        setSession({ step: "placed", to, callId: call.id });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "The phone call could not be placed.";
        setSession({ step: "refused", to, message, at: Date.now() });
      }
    },
    [agent],
  );

  const reset = useCallback(() => setSession(null), []);

  let state: ConsoleState | null = null;
  if (session?.step === "placing") state = placingState(session.to);
  else if (session?.step === "refused")
    state = refusedState(session.to, session.message, session.at);
  else if (session?.step === "placed")
    state =
      record && agent
        ? fromCallRecord(record, agent.flow)
        : { ...placingState(session.to), callId: session.callId };

  return { state, place, reset };
}
