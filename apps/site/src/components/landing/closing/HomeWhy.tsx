"use client";

import type { ReactNode } from "react";
import styled, { keyframes } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { EXAMPLE_LANGUAGES, useExampleLanguage } from "../language";
import { SectionHeader } from "../structure";
import { mix, tile, useSpotlight } from "./shared";

// Home: the four reasons to trust it, one sentence each. /product shows them
// working.

const travel = keyframes`
  0% { transform: translateX(0); opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { transform: translateX(88px); opacity: 0; }
`;
const talk = keyframes`
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(1); }
`;
const sweep = keyframes`
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
`;

const Glyph = styled.svg`
  height: ${({ theme }) => theme.space(14)};
  width: auto;
  overflow: visible;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;

  /* The loops play while the tile is hovered; at rest each glyph is a still. */
  [data-spot]:hover & {
    .dot {
      animation: ${travel} 2.8s linear infinite;
    }
    .bar {
      transform-box: fill-box;
      transform-origin: center;
      animation: ${talk} 1.1s ease-in-out infinite;
    }
    .trace {
      stroke-dasharray: 100;
      animation: ${sweep} 3.2s ${({ theme }) => theme.motion.ease} infinite alternate;
    }
  }
`;

// The flow decides: three nodes, one token moving along the fixed path.
function FlowGlyph() {
  return (
    <Glyph viewBox="0 0 132 56" aria-hidden="true">
      <path d="M22 28h88" style={{ stroke: color.lineStrong }} strokeDasharray="2 5" />
      <circle className="dot" cx={22} cy={28} r={3.5} style={{ fill: color.fg }} />
      {[
        [8, color.node.start],
        [52, color.node.ask],
        [96, color.node.end],
      ].map(([x, tone]) => (
        <rect key={x} x={x} y={16} width={28} height={24} rx={7} style={{ fill: color.elevated, stroke: tone as string }} />
      ))}
      <path d="M61 28l3.5 3.5 6-7" style={{ stroke: color.node.ask }} />
    </Glyph>
  );
}

// Interrupt it: the agent's audio, cut where the caller comes in.
function InterruptGlyph() {
  const heights = [14, 26, 18, 34, 22, 30, 16, 28, 20, 32, 14, 24, 18];
  return (
    <Glyph viewBox="0 0 132 56" aria-hidden="true">
      {heights.map((h, i) => {
        const said = i < 7;
        return (
          <path
            key={i}
            className={said ? "bar" : undefined}
            style={
              said
                ? { stroke: color.accentLine, animationDelay: `${i * -170}ms` }
                : { stroke: color.fgFaint }
            }
            d={`M${10 + i * 9} ${28 - h / 2}v${h}`}
            strokeWidth={said ? 3.5 : 1.5}
            strokeDasharray={said ? undefined : "2 4"}
          />
        );
      })}
      <path d="M68.5 4v48" style={{ stroke: color.pink }} />
    </Glyph>
  );
}

// The language tile's glyph is the switch itself, in miniature.
const MiniSwitch = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const MiniOption = styled.button<{ $on: boolean; $tone: string }>`
  ${type("overline")}
  min-width: ${({ theme }) => theme.space(10)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ $on, $tone, theme }) => ($on ? $tone : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ $on, $tone }) => mix($tone, $on ? 18 : 0)};
  color: ${({ $on, $tone, theme }) => ($on ? $tone : theme.color.fgSubtle)};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ $tone }) => $tone};
  }
`;

const SHORT = { en: "EN", hi: "HI", hinglish: "MIX" } as const;
const TONES = { en: color.info, hi: color.accentText, hinglish: color.pink } as const;

function LanguageGlyph() {
  const { language, setLanguage } = useExampleLanguage();
  return (
    <MiniSwitch role="radiogroup" aria-label="Language of the example calls">
      {EXAMPLE_LANGUAGES.map((option) => (
        <MiniOption
          key={option.id}
          type="button"
          role="radio"
          aria-checked={language === option.id}
          aria-label={option.label}
          $on={language === option.id}
          $tone={TONES[option.id]}
          onClick={() => setLanguage(option.id)}
        >
          {SHORT[option.id]}
        </MiniOption>
      ))}
    </MiniSwitch>
  );
}

// Every turn is traced: four moments on one line.
function TraceGlyph() {
  const marks = [color.fgMuted, color.violet, color.pink, color.accentLine];
  return (
    <Glyph viewBox="0 0 132 56" aria-hidden="true">
      <defs>
        <linearGradient id="home-why-trace" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: color.violet }} />
          <stop offset="0.5" style={{ stopColor: color.pink }} />
          <stop offset="1" style={{ stopColor: color.accentLine }} />
        </linearGradient>
      </defs>
      <path d="M12 28h108" style={{ stroke: color.line }} strokeWidth={4} />
      <path className="trace" d="M12 28h108" pathLength={100} stroke="url(#home-why-trace)" strokeWidth={4} />
      {marks.map((tone, i) => (
        <circle key={i} cx={12 + i * 36} cy={28} r={6} style={{ fill: color.canvas, stroke: tone }} strokeWidth={2} />
      ))}
    </Glyph>
  );
}

const REASONS: { title: string; body: string; tone: string; glyph: ReactNode }[] = [
  {
    title: "It stays on script.",
    body: "A fixed flow picks every question. The model only words it.",
    tone: color.accentText,
    glyph: <FlowGlyph />,
  },
  {
    title: "Talk over it.",
    body: "It stops mid-word and listens to what you said.",
    tone: color.pink,
    glyph: <InterruptGlyph />,
  },
  {
    title: "English, Hindi, Hinglish.",
    body: "Three today, more planned. It follows the caller turn by turn.",
    tone: color.info,
    glyph: <LanguageGlyph />,
  },
  {
    title: "Every reply is timed.",
    body: "From the caller's last word to the first audio they hear.",
    tone: color.violet,
    glyph: <TraceGlyph />,
  },
];

const Tiles = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

const Tile = styled.article<{ $tone: string }>`
  ${tile}
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0 ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(5)};

  /* Phones: glyph beside the text. Wider: glyph above it. */
  > :first-child {
    grid-row: span 2;
  }
  svg {
    height: ${({ theme }) => theme.space(10)};
  }
  h3 {
    ${type("heading")}
    align-self: end;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    align-self: start;
  }

  ${({ theme }) => theme.media.sm} {
    display: block;
    padding: ${({ theme }) => theme.space(6)};

    svg {
      height: ${({ theme }) => theme.space(16)};
    }
    ${MiniSwitch} {
      height: ${({ theme }) => theme.space(16)};
    }
    h3 {
      margin-top: ${({ theme }) => theme.space(5)};
    }
  }
  p {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

export default function HomeWhy() {
  const onPointerMove = useSpotlight();

  return (
    <Section id="why">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Why trust it"
            title="Four reasons to rely on it."
            more={{ href: "/product", label: "See it working" }}
          />
        </Reveal>
        <Reveal>
          <Tiles onPointerMove={onPointerMove}>
            {REASONS.map((reason) => (
              <Tile key={reason.title} $tone={reason.tone} data-spot>
                {reason.glyph}
                <h3>{reason.title}</h3>
                <p>{reason.body}</p>
              </Tile>
            ))}
          </Tiles>
        </Reveal>
      </Container>
    </Section>
  );
}
