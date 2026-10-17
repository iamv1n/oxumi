"use client";

import { PhoneOutlined } from "@ant-design/icons";
import type { DraftFlow } from "@oxumi/flow-core";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import styled, { css, keyframes } from "styled-components";
import type { AgentDetail, Credential, Health, SpeechInfo } from "@/lib/api";
import { type } from "@oxumi/ui/design/typography";
import type { LevelStore } from "./level";
import { type ConsoleState, formatClock, type Mode, type Phase } from "./state";

// Everything the three zones need. The console is a pure function of this.
export interface ConsoleProps {
  projectId: string;
  agent: AgentDetail;
  // Undefined while /health is loading.
  health: Health | undefined;
  state: ConsoleState;
  variables: Record<string, string>;
  // Model override: "<provider>:<model>", or "" for the agent's own.
  model: string;
  mic?: LevelStore;
  // The project's provider connections, for the number phone calls come from.
  credentials: Credential[] | undefined;
  // The number a phone call would dial, as typed.
  phoneTo: string;
  onPhoneTo: (value: string) => void;
  onVariable: (name: string, value: string) => void;
  onModel: (ref: string) => void;
  onStart: (mode: Mode) => void;
  onHangUp: () => void;
  // Returns false when the reply could not be sent.
  onSend: (text: string) => boolean;
}

// ---- Helpers ---------------------------------------------------------------

// A translucent tint of a theme colour.
export const tint = (colour: string, percent: number): string =>
  `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

export const humanize = (id: string): string => {
  const words = id.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const fillTemplate = (text: string, variables: Record<string, string>): string =>
  text.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, name: string) => {
    const value = variables[name]?.trim();
    return value || `{{${name}}}`;
  });

// The model a call will run on: the override, else the agent's, else the server's.
export const resolveModel = (
  override: string,
  agent: Pick<AgentDetail, "model">,
  health: Health | undefined,
): string => override || agent.model || health?.defaultModel || "";

export const providerOf = (ref: string, health: Health | undefined) =>
  health?.providers.find((provider) => ref.startsWith(`${provider.id}:`));

// The speech provider a voice call will use: the agent's own choice, else
// the first one the project has connected.
export function speechFor(
  agent: Pick<AgentDetail, "speech">,
  health: Health | undefined,
): SpeechInfo | undefined {
  const speech = health?.speech ?? [];
  return agent.speech
    ? speech.find((provider) => provider.id === agent.speech)
    : speech.find((provider) => provider.available);
}

// Why a voice call cannot start, or null when it can.
export function voiceBlocker(
  agent: Pick<AgentDetail, "speech">,
  health: Health | undefined,
): string | null {
  if (!health) return "Checking which speech providers are connected…";
  const chosen = speechFor(agent, health);
  if (agent.speech && chosen && !chosen.available)
    return `${chosen.label} is not connected. Connect it under Integrations.`;
  if (!health.voice || !chosen) return "Connect ElevenLabs or Sarvam under Integrations.";
  return null;
}

export const missingVariables = (flow: DraftFlow, variables: Record<string, string>): string[] =>
  flow.variables.filter((v) => !variables[v.name]?.trim()).map((v) => v.name);

// ---- Shared pieces ---------------------------------------------------------

export const ZoneHeader = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: 40px;
  padding: 0 ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  flex-shrink: 0;

  h2 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  .grow {
    flex: 1;
  }
`;

export const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  font-weight: 500;
  color: ${({ theme }) => theme.color.accentText};
  border-radius: ${({ theme }) => theme.radius.control};
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

export const HangUpIcon = styled(PhoneOutlined)`
  transform: rotate(135deg);
`;

export const Code = styled.code`
  ${type("code")}
  padding: 1px ${({ theme }) => theme.space(1.5)};
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme }) => theme.color.hover};
  color: ${({ theme }) => theme.color.fg};
  overflow-wrap: anywhere;
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  70%, 100% { transform: scale(2.6); opacity: 0; }
`;

type Tone = "live" | "pending" | "idle" | "error";

// A small status light; pulses while something is happening.
export const Dot = styled.span<{ $tone: Tone }>`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) =>
    ({
      live: theme.color.success,
      pending: theme.color.warning,
      idle: theme.color.fgFaint,
      error: theme.color.danger,
    })[$tone]};

  ${({ $tone }) =>
    ($tone === "live" || $tone === "pending") &&
    css`
      &::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: inherit;
        animation: ${pulse} 1.8s ${({ theme }) => theme.motion.ease} infinite;
      }
    `}
`;

const Clock = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-variant-numeric: tabular-nums;
`;

// Call duration; ticks while the call is live and freezes when it ends.
export function CallTimer({ state }: { state: ConsoleState }) {
  const { startedAt, endedAt, status } = state;
  const [now, setNow] = useState<number | null>(null);
  const running = status === "live" && startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running]);

  let elapsed = 0;
  if (startedAt !== null) {
    if (endedAt !== null) elapsed = endedAt - startedAt;
    else if (now !== null) elapsed = now - startedAt;
  }
  return (
    <Clock role="timer" aria-label="Call duration">
      {formatClock(elapsed)}
    </Clock>
  );
}

// ---- Voice activity --------------------------------------------------------

const wave = keyframes`
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
`;
const blink = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
`;

const Bars = styled.span<{ $phase: Phase; $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ $size }) => Math.max(2, Math.round($size / 8))}px;
  height: ${({ $size }) => $size}px;
  color: ${({ theme, $phase }) =>
    ({
      speaking: theme.color.accentLine,
      listening: theme.color.success,
      thinking: theme.color.fgMuted,
    })[$phase]};

  i {
    display: block;
    width: ${({ $size }) => Math.max(2, Math.round($size / 7))}px;
    height: 100%;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: currentColor;
    transform-origin: center;
    transition: transform 80ms linear;
  }

  ${({ $phase }) =>
    $phase === "speaking" &&
    css`
      i {
        animation: ${wave} 0.9s ease-in-out infinite;
      }
      i:nth-child(1) { animation-delay: -0.6s; }
      i:nth-child(2) { animation-delay: -0.2s; }
      i:nth-child(3) { animation-delay: -0.75s; }
      i:nth-child(4) { animation-delay: -0.4s; }
      i:nth-child(5) { animation-delay: -0.1s; }
    `}

  ${({ $phase, $size }) =>
    $phase === "thinking" &&
    css`
      gap: ${Math.max(3, Math.round($size / 6))}px;
      i {
        width: ${Math.max(4, Math.round($size / 4.5))}px;
        height: ${Math.max(4, Math.round($size / 4.5))}px;
        animation: ${blink} 1.2s ease-in-out infinite;
      }
      i:nth-child(2) { animation-delay: 0.15s; }
      i:nth-child(3) { animation-delay: 0.3s; }
      i:nth-child(n + 4) { display: none; }
    `}
`;

// Shape of the meter at full loudness: tallest in the middle.
const PROFILE = [0.55, 0.85, 1, 0.8, 0.5];
const NO_LEVEL: LevelStore = { subscribe: () => () => {}, get: () => 0 };

// Five bars: animated while the agent speaks, driven by the real microphone
// level while the console is listening, three dots while the agent thinks.
export function ActivityBars({
  phase,
  mic,
  size = 16,
}: {
  phase: Phase;
  mic?: LevelStore;
  size?: number;
}) {
  const store = phase === "listening" && mic ? mic : NO_LEVEL;
  const level = useSyncExternalStore(store.subscribe, store.get, () => 0);
  return (
    <Bars $phase={phase} $size={size} aria-hidden>
      {PROFILE.map((peak, i) => (
        <i
          key={i}
          style={
            phase === "listening"
              ? { transform: `scaleY(${(0.22 + level * peak * 0.78).toFixed(3)})` }
              : undefined
          }
        />
      ))}
    </Bars>
  );
}

export const modeLabel = (mode: Mode): string =>
  ({ voice: "Voice call", text: "Text call", phone: "Phone call" })[mode];

export function phaseLabel(phase: Phase, mode: Mode, hearing: boolean): string {
  if (mode === "voice") {
    if (phase === "speaking") return "Agent speaking";
    if (phase === "thinking") return "Agent thinking";
    return hearing ? "Hearing you" : "Listening";
  }
  if (phase === "speaking") return "Agent replying";
  if (phase === "thinking") return "Agent thinking";
  return "Your turn";
}
