"use client";

import styled from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { SectionHeader } from "../structure";
import { mix, tile, useSpotlight } from "./shared";

// /about: the mission stated once, then the values that follow from it.

const Mission = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
  padding-top: ${({ theme }) => theme.space(8)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(12)};
  }

  h3 {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  p {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fg};
    text-wrap: pretty;
  }
`;

const Tiles = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(5)};
  }

  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

const Tile = styled.li<{ $tone: string }>`
  ${tile}
  padding: ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(8)};
  }

  h3 {
    ${type("heading")}
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
  p {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const Number = styled.span`
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

const VALUES = [
  {
    title: "Honest on the line.",
    body: "The agent says it is an automated assistant at the start of every call, says when a call is recorded, and stops calling a number as soon as it is asked to.",
    tone: color.accentText,
  },
  {
    title: "Predictable, not clever.",
    body: "Every call follows the flow you published and ends in a checked result, not just a transcript. The model words the reply; it does not choose the questions.",
    tone: color.pink,
  },
  {
    title: "Speak the way people speak.",
    body: "Hindi, English or the mix of both, following the caller turn by turn. Replies come quickly, and the caller can interrupt at any point.",
    tone: color.info,
  },
  {
    title: "Respect the person who picked up.",
    body: "Calls are short and patient. “Call me later” and “I’d rather not say” are valid answers, and the agent asks only for what the call needs.",
    tone: color.success,
  },
  {
    title: "Built for the person who runs the desk.",
    body: "A clinic manager or an operations lead should be able to design and test a call without writing code or a prompt.",
    tone: color.violet,
  },
  {
    title: "Everything is on the record.",
    body: "Each call keeps its transcript, the answers collected and the timing of every reply, so you can see what happened and why.",
    tone: color.warning,
  },
] as const;

export default function AboutValues() {
  const onPointerMove = useSpotlight();

  return (
    <>
      <Section id="mission">
        <Container>
          <Reveal>
            <Mission>
              <div>
                <h3>Mission</h3>
                <p>
                  Let any business that runs on scripted phone calls hand those calls to a voice
                  agent it can trust: one that asks every question it was told to ask, in the
                  caller&rsquo;s own language, and brings back answers the business can use.
                </p>
              </div>
              <div>
                <h3>Where this goes</h3>
                <p>
                  Routine calls get made on time, every time, and the people who answer them are
                  treated with the patience they would get from a good human caller.
                </p>
              </div>
            </Mission>
          </Reveal>
        </Container>
      </Section>

      <Section id="values">
        <Container>
          <Reveal>
            <SectionHeader eyebrow="What we hold to" title="Six values, one for every call." />
          </Reveal>
          <Reveal>
            <Tiles onPointerMove={onPointerMove}>
              {VALUES.map((value, i) => (
                <Tile key={value.title} $tone={value.tone} data-spot>
                  <Number>0{i + 1}</Number>
                  <h3>{value.title}</h3>
                  <p>{value.body}</p>
                </Tile>
              ))}
            </Tiles>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
