"use client";

import styled, { css, keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { type Localized, useExampleLanguage } from "../language";
import { mix, Stage, StageNote } from "./shared";

// Looping example of a barge-in: the agent is speaking, the caller starts
// talking, the agent's audio stops at that point, and it answers afterwards.

// What is said, in each example language. The struck-through part of the
// first line is what the agent was about to say when it was cut off.
const SAID: Localized = {
  en: "Your appointment is tomorrow morning",
  hi: "आपका अपॉइंटमेंट कल सुबह",
  hinglish: "Aapka appointment kal subah",
};
const UNSAID: Localized = {
  en: "at ten, will you be ab…",
  hi: "दस बजे का है, क्या आप आ…",
  hinglish: "das baje ka hai, aap aa…",
};
const CUT_IN: Localized = {
  en: "One minute, tomorrow won't work.",
  hi: "एक मिनट, कल नहीं हो पाएगा।",
  hinglish: "Ek minute, kal nahi ho payega.",
};
const REPLY: Localized = {
  en: "All right. Which day suits you?",
  hi: "ठीक है। कौन सा दिन ठीक रहेगा?",
  hinglish: "Theek hai. Kaunsa din theek rahega?",
};

const BARS = 44;
const CALLER_FROM = 19;
const CUT = 21; // agent stops here
const CALLER_TO = 33;
const AGENT_BACK = 35;
const LOOP = "8s";
// The playhead crosses the track during the first 70% of the loop.
const at = (bar: number) => Math.round((bar / BARS) * 70);

const height = (i: number, seed: number) =>
  28 + Math.round(72 * Math.abs(Math.sin(i * 1.9 + seed) * Math.cos(i * 0.7 + seed)));

const sweep = keyframes`
  0% { clip-path: inset(0 100% 0 0); }
  70%, 94% { clip-path: inset(0 0 0 0); }
  100% { clip-path: inset(0 0 0 100%); }
`;
const head = keyframes`
  0% { left: 0; opacity: 1; }
  70% { left: 100%; opacity: 1; }
  74%, 100% { left: 100%; opacity: 0; }
`;
const litFrom = (percent: number) => keyframes`
  0%, ${percent}% { opacity: 0.3; }
  ${percent + 3}%, 95% { opacity: 1; }
  100% { opacity: 0.3; }
`;
const litCut = litFrom(at(CUT));
const litCaller = litFrom(at(CALLER_FROM));
const litAgent = litFrom(0);
const litBack = litFrom(at(AGENT_BACK));

const loop = (frames: ReturnType<typeof keyframes>) => css`
  [data-in="true"] & {
    animation: ${frames} ${LOOP} linear infinite;
  }
`;

// Fills the card it sits in; the spare height goes to the waveforms.
const Frame = styled(Stage)`
  display: flex;
  flex-direction: column;
`;

const Tracks = styled.div`
  position: relative;
  display: grid;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: 1fr 1fr;
  gap: ${({ theme }) => theme.space(3)};
  align-items: center;
  padding-top: ${({ theme }) => theme.space(6)};
`;

const Who = styled.span<{ $row: number }>`
  ${type("overline")}
  grid-column: 1;
  grid-row: ${({ $row }) => $row};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Lane = styled.div<{ $row: number }>`
  position: relative;
  grid-column: 2;
  grid-row: ${({ $row }) => $row};
  height: 100%;
  min-height: ${({ theme }) => theme.space(12)};
`;

const Wave = styled.div<{ $lit?: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: ${({ $lit }) => ($lit ? 1 : 0.22)};

  ${({ $lit }) => $lit && loop(sweep)}
`;

const Bar = styled.i<{ $kind: "agent" | "caller" | "unsaid" | "quiet" }>`
  flex: 1;
  min-width: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $kind, theme }) =>
    $kind === "agent"
      ? theme.color.accent
      : $kind === "caller"
        ? theme.color.info
        : theme.color.fgFaint};
  ${({ $kind, theme }) =>
    $kind === "unsaid" &&
    css`
      background: none;
      border: 1px dashed ${mix(theme.color.accent, 60)};
    `}
`;

const Playhead = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 100%;
  width: 1px;
  background: ${({ theme }) => theme.color.fgMuted};
  opacity: 0;

  ${loop(head)}
`;

const CutMark = styled.span`
  ${type("caption")}
  position: absolute;
  top: ${({ theme }) => theme.space(-2)};
  bottom: ${({ theme }) => theme.space(-2)};
  left: ${(CUT / BARS) * 100}%;
  border-left: 1px solid ${({ theme }) => theme.color.pink};
  color: ${({ theme }) => theme.color.pink};

  b {
    position: absolute;
    bottom: 100%;
    left: 0;
    padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => mix(theme.color.pink, 16)};
    font-weight: ${({ theme }) => theme.text.label.weight};
    white-space: nowrap;
    transform: translateX(-50%);
  }

  ${loop(litCut)}
`;

const Script = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(5)};
`;

const Said = styled.li<{ $step: 0 | 1 | 2; $hindi: boolean }>`
  ${type("body")}

  > span {
    font-family: ${({ $hindi, theme }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  }
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space(14)} minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fg};

  small {
    ${type("overline")}
    padding-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  s {
    color: ${({ theme }) => theme.color.fgFaint};
    text-decoration-color: ${({ theme }) => theme.color.fgFaint};
  }

  ${({ $step }) => loop([litAgent, litCaller, litBack][$step]!)}
`;

const Rail = styled.div`
  position: relative;
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: stretch;
  pointer-events: none;
`;

const agentKind = (i: number) =>
  i < CUT || i >= AGENT_BACK ? "agent" : i < CALLER_TO ? "unsaid" : "quiet";
const callerKind = (i: number) => (i >= CALLER_FROM && i < CALLER_TO ? "caller" : "quiet");

function Track({ kind, seed }: { kind: (i: number) => "agent" | "caller" | "unsaid" | "quiet"; seed: number }) {
  // Drawn twice: a dim copy of the whole turn, and a lit copy the playhead uncovers.
  return [false, true].map((lit) => (
    <Wave key={String(lit)} $lit={lit}>
      {Array.from({ length: BARS }, (_, i) => (
        <Bar key={i} $kind={kind(i)} style={{ height: kind(i) === "quiet" ? 3 : `${height(i, seed)}%` }} />
      ))}
    </Wave>
  ));
}

export default function InterruptExample() {
  const { language } = useExampleLanguage();
  const hindi = language === "hi";
  const lang = hindi ? "hi" : undefined;

  return (
    <Frame aria-label="Diagram of the agent stopping when the caller starts talking">
      <Tracks>
        <Who $row={1}>Agent</Who>
        <Lane $row={1} aria-hidden="true">
          <Track kind={agentKind} seed={0.4} />
        </Lane>
        <Who $row={2}>Caller</Who>
        <Lane $row={2} aria-hidden="true">
          <Track kind={callerKind} seed={2.1} />
        </Lane>
        <Rail aria-hidden="true">
          <CutMark>
            <b>agent stops</b>
          </CutMark>
          <Playhead />
        </Rail>
      </Tracks>

      <Script>
        <Said $step={0} $hindi={hindi}>
          <small>Agent</small>
          <span lang={lang}>
            {SAID[language]} <s>{UNSAID[language]}</s>
          </span>
        </Said>
        <Said $step={1} $hindi={hindi}>
          <small>Caller</small>
          <span lang={lang}>{CUT_IN[language]}</span>
        </Said>
        <Said $step={2} $hindi={hindi}>
          <small>Agent</small>
          <span lang={lang}>{REPLY[language]}</span>
        </Said>
      </Script>

      <StageNote>
        <b>Diagram</b>
        Looping example. The dashed bars are the words the agent never said.
      </StageNote>
    </Frame>
  );
}
