"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Reveal } from "@/components/landing/kit";
import { CallArt, CollectArt, DesignArt } from "./StepArt";

// Design, Call, Collect in depth (Product page), each with its illustration.

const STEPS: { name: string; title: string; text: string; art: ReactNode }[] = [
  {
    name: "Design",
    title: "Start with what you need to know.",
    text: "Drag in a step for each thing you need to know and name the field it fills: a place, a yes or no, one option from a list. Add a branch where an answer changes what comes next.",
    art: <DesignArt />,
  },
  {
    name: "Call",
    title: "Hear it before they do.",
    text: "Talk to the flow in your browser until it sounds right. Then point the same flow at a phone number. Nothing is rewritten in between.",
    art: <CallArt />,
  },
  {
    name: "Collect",
    title: "Get rows, not recordings.",
    text: "Each call becomes one row with one outcome, including the calls that end early. Sort it, filter it, act on it.",
    art: <CollectArt />,
  },
];

export default function Steps() {
  return (
    <List>
      {STEPS.map((step, i) => (
        <li key={step.name}>
          <Reveal delay={i * 120}>
            {step.art}
            <Name>
              <i aria-hidden="true">0{i + 1}</i>
              {step.name}
            </Name>
            <Title>{step.title}</Title>
            <Text>{step.text}</Text>
          </Reveal>
        </li>
      ))}
    </List>
  );
}

const List = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(14)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(8)};
  }
  ${({ theme }) => theme.media.lg} {
    gap: ${({ theme }) => theme.space(12)};
  }
`;

const Name = styled.p`
  ${type("overline")}
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(6)};
  color: ${({ theme }) => theme.color.accentText};

  i {
    ${type("title")}
    font-family: ${({ theme }) => theme.font.display};
    font-style: italic;
    font-weight: 400;
    letter-spacing: 0;
  }
`;

const Title = styled.h3`
  ${type("title")}
  margin-top: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: balance;
`;

const Text = styled.p`
  ${type("body")}
  font-size: ${({ theme }) => theme.text.heading.size};
  line-height: ${({ theme }) => theme.text.lede.line};
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;
