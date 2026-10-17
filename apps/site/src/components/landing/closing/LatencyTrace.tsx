"use client";

import styled, { keyframes } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { mix, Stage, StageNote } from "./shared";

// The four moments every reply is timed across, drawn as a staged bar.
// Segments are equal on purpose: this shows the stages, not how long they take.

const STAGES = [
  { mark: "t0", label: "Caller stops speaking", note: "The clock starts.", tone: color.fgMuted, span: "transcribing" },
  { mark: "t1", label: "Transcript final", note: "The caller's words are settled.", tone: color.violet, span: "model thinking" },
  { mark: "t2", label: "First word from the model", note: "The reply starts streaming.", tone: color.pink, span: "voice rendering" },
  { mark: "t3", label: "First audio out", note: "The caller hears the agent.", tone: color.accentText, span: null },
];

const STEP = 650; // ms between stages when the bar draws in

const pop = keyframes`
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;
const growX = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;
const growY = keyframes`
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
`;
const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;
const shimmer = keyframes`
  0%, 30% { background-position: 150% 0; }
  100% { background-position: -150% 0; }
`;
const speak = keyframes`
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
`;

const List = styled.ol`
  display: grid;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Item = styled.li<{ $i: number; $tone: string; $next: string }>`
  --tone: ${({ $tone }) => $tone};
  --next: ${({ $next }) => $next};
  --delay: ${({ $i }) => 300 + $i * STEP}ms;
  position: relative;
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space(4)} minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space(4)};
  padding-bottom: ${({ theme }) => theme.space(7)};

  &:last-child {
    padding-bottom: 0;
  }

  ${({ theme }) => theme.media.md} {
    display: block;
    padding-bottom: 0;
  }
`;

const Track = styled.div`
  position: relative;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  align-items: center;

  ${({ theme }) => theme.media.md} {
    flex-direction: row;
    height: ${({ theme }) => theme.space(4)};
  }
`;

const Dot = styled.span`
  position: relative;
  z-index: 1;
  flex: none;
  width: ${({ theme }) => theme.space(4)};
  height: ${({ theme }) => theme.space(4)};
  border: 2px solid var(--tone);
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.canvas};
  box-shadow: 0 0 0 ${({ theme }) => theme.space(1)} ${mix("var(--tone)", 18)};
  opacity: 0;

  [data-in="true"] & {
    animation: ${pop} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease} var(--delay) forwards;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }
`;

const Segment = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.space(4)};
  bottom: ${({ theme }) => theme.space(-7)};
  left: 50%;
  width: ${({ theme }) => theme.space(1.5)};
  margin-left: ${({ theme }) => theme.space(-0.75)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(180deg, var(--tone), var(--next));
  transform: scaleY(0);
  transform-origin: top;

  [data-in="true"] & {
    animation: ${growY} ${STEP}ms linear var(--delay) forwards;
  }

  ${({ theme }) => theme.media.md} {
    position: relative;
    inset: auto;
    flex: 1;
    width: auto;
    height: ${({ theme }) => theme.space(2)};
    margin: 0;
    background:
      linear-gradient(
          100deg,
          transparent 35%,
          ${({ theme }) => mix(theme.color.fg, 55)} 50%,
          transparent 65%
        )
        150% 0 / 300% 100% no-repeat,
      linear-gradient(90deg, var(--tone), var(--next));
    transform: scaleX(0);
    transform-origin: left;

    [data-in="true"] & {
      animation:
        ${growX} ${STEP}ms linear var(--delay) forwards,
        ${shimmer} 4.5s linear calc(var(--delay) + 1.2s) infinite;
    }
  }

  ${({ theme }) => theme.media.reducedMotion} {
    transform: none;
  }
`;

const Voice = styled.span`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 3px;
    height: ${({ theme }) => theme.space(6)};
    padding-left: ${({ theme }) => theme.space(2)};
    mask-image: linear-gradient(to right, ${({ theme }) => theme.color.canvas}, transparent 85%);
    opacity: 0;

    [data-in="true"] & {
      animation: ${rise} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease} var(--delay) forwards;
    }
    i {
      flex: none;
      width: 3px;
      height: 100%;
      border-radius: ${({ theme }) => theme.radius.pill};
      background: var(--tone);
      animation: ${speak} 1.1s ease-in-out infinite;
    }
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }
`;

const Text = styled.div`
  opacity: 0;

  [data-in="true"] & {
    animation: ${rise} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease} var(--delay) forwards;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }

  ${({ theme }) => theme.media.md} {
    margin-top: ${({ theme }) => theme.space(4)};
    padding-right: ${({ theme }) => theme.space(5)};
  }
`;

const Mark = styled.span`
  ${type("code")}
  color: var(--tone);
`;

const Label = styled.p`
  ${type("heading")}
  margin-top: ${({ theme }) => theme.space(0.5)};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: balance;
`;

const Note = styled.p`
  ${type("label")}
  font-weight: ${({ theme }) => theme.text.body.weight};
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Span = styled.p`
  ${type("caption")}
  display: inline-block;
  margin-top: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${mix("var(--next)", 12)};
  color: var(--next);
`;

export default function LatencyTrace() {
  return (
    <Stage aria-label="Diagram of the four moments each reply is timed across">
      <List>
        {STAGES.map((stage, i) => (
          <Item key={stage.mark} $i={i} $tone={stage.tone} $next={STAGES[i + 1]?.tone ?? stage.tone}>
            <Track aria-hidden="true">
              <Dot />
              {stage.span ? (
                <Segment />
              ) : (
                <Voice>
                  {Array.from({ length: 22 }, (_, bar) => (
                    <i key={bar} style={{ animationDelay: `${-(bar * 137) % 1100}ms` }} />
                  ))}
                </Voice>
              )}
            </Track>
            <Text>
              <Mark>{stage.mark}</Mark>
              <Label>{stage.label}</Label>
              <Note>{stage.note}</Note>
              {stage.span && <Span>then: {stage.span}</Span>}
            </Text>
          </Item>
        ))}
      </List>

      <StageNote>
        <b>Diagram</b>
        The stages each reply is timed across. Segment lengths are equal by design: this
        is not a measurement.
      </StageNote>
    </Stage>
  );
}
