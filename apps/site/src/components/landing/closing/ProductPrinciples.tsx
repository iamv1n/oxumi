"use client";

import {
  ApartmentOutlined,
  FolderOutlined,
  HistoryOutlined,
  RightOutlined,
  RobotOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import styled from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { SectionHeader } from "../structure";
import EngineExample from "./EngineExample";
import InterruptExample from "./InterruptExample";
import LanguageExample from "./LanguageExample";
import LatencyTrace from "./LatencyTrace";
import { mix, Pill, tile, useSpotlight } from "./shared";

// /product: the four principles, each a compact band that states the idea
// once and then shows it happening.

const Bands = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(5)};

  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

const Band = styled.article<{ $tone: string; $layout: "left" | "right" | "stack" }>`
  ${tile}
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(8)};
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: ${({ $layout }) =>
      $layout === "left"
        ? "minmax(0, 4fr) minmax(0, 7fr)"
        : $layout === "right"
          ? "minmax(0, 7fr) minmax(0, 4fr)"
          : "minmax(0, 1fr)"};
    gap: ${({ theme }) => theme.space(10)};
    align-items: center;
    padding: ${({ theme }) => theme.space(10)};

    /* "right" puts the example first and the words second. */
    > :first-child {
      order: ${({ $layout }) => ($layout === "right" ? 1 : 0)};
    }
  }
`;

const Number = styled.p`
  ${type("code")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  color: var(--tone);

  &::after {
    content: "";
    width: ${({ theme }) => theme.space(8)};
    height: 1px;
    background: ${mix("var(--tone)", 50)};
  }
`;

const Title = styled.h3`
  ${type("title")}
  margin-top: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: balance;
`;

const Body = styled.p`
  ${type("body")}
  font-size: ${({ theme }) => theme.text.heading.size};
  line-height: ${({ theme }) => theme.text.lede.line};
  max-width: 34rem;
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

const Proof = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(5)};
`;

const Structure = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(5)};
  align-items: center;
  padding: ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(8)};
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: ${({ theme }) => theme.space(10)};
    padding-inline: ${({ theme }) => theme.space(10)};
  }

  h3 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Tree = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgFaint};
`;

const Node = styled.span<{ $tone?: string }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
  color: ${({ theme }) => theme.color.fg};

  .anticon {
    color: ${({ $tone, theme }) => $tone ?? theme.color.fgMuted};
  }
`;

const Leaves = styled.span`
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
  padding-left: ${({ theme }) => theme.space(4)};
  border-left: 1px solid ${({ theme }) => theme.color.lineStrong};
`;

interface Principle {
  title: string;
  body: string;
  tone: string;
  layout: "left" | "right" | "stack";
  example: ReactNode;
  proof?: string[];
}

const PRINCIPLES: Principle[] = [
  {
    title: "The flow decides. The model speaks.",
    body: "A deterministic engine owns which question comes next and when the call is done. The model words the reply and proposes values; each one is validated before it is kept. It cannot skip a question or invent a step.",
    tone: color.accentText,
    layout: "left",
    example: <EngineExample />,
  },
  {
    title: "Interrupt it like a person.",
    body: "Speech is streamed in both directions. When the caller talks over the agent, it stops mid-word, listens, and answers what was actually said.",
    tone: color.pink,
    layout: "right",
    example: <InterruptExample />,
  },
  {
    title: "English, Hindi, and the mix in between.",
    body: "Agents speak English, Hindi and Hinglish today, with more languages planned. They follow the caller turn by turn, including the code-switching most real calls in India are made of.",
    tone: color.info,
    layout: "left",
    example: <LanguageExample />,
  },
  {
    title: "Every turn is traced.",
    body: "Each reply is timed from the moment the caller stops speaking to the first audio they hear, and stored beside the transcript and the flow step. A slow turn is something you can find.",
    tone: color.violet,
    layout: "stack",
    example: <LatencyTrace />,
    proof: ["Transcript", "Flow step", "Time to first word", "Time to first audio"],
  },
];

export default function ProductPrinciples() {
  const onPointerMove = useSpotlight();

  return (
    <Section id="principles">
      <Container>
        <Reveal>
          <SectionHeader eyebrow="Why it holds up" title="Reliable by construction." />
        </Reveal>

        <Bands onPointerMove={onPointerMove}>
          {PRINCIPLES.map((item, i) => (
            <Reveal key={item.title}>
              <Band $tone={item.tone} $layout={item.layout} data-spot>
                <div>
                  <Number>0{i + 1}</Number>
                  <Title>{item.title}</Title>
                  <Body>{item.body}</Body>
                  {item.proof && (
                    <Proof aria-label="Recorded for every reply">
                      {item.proof.map((label) => (
                        <li key={label}>
                          <Pill>{label}</Pill>
                        </li>
                      ))}
                    </Proof>
                  )}
                </div>
                {item.example}
              </Band>
            </Reveal>
          ))}

          <Reveal>
            <Structure>
              <div>
                <h3>Organised the way your work is.</h3>
                <p>Projects hold agents. Each agent keeps its own flow, settings and call history.</p>
              </div>
              <Tree aria-hidden="true">
                <Node $tone={color.accentText}>
                  <FolderOutlined /> Project
                </Node>
                <RightOutlined />
                <Node $tone={color.pink}>
                  <RobotOutlined /> Agent
                </Node>
                <Leaves>
                  <Node>
                    <ApartmentOutlined /> Flow
                  </Node>
                  <Node>
                    <SlidersOutlined /> Persona, languages, voice, model
                  </Node>
                  <Node>
                    <HistoryOutlined /> Call history
                  </Node>
                </Leaves>
              </Tree>
            </Structure>
          </Reveal>
        </Bands>
      </Container>
    </Section>
  );
}
