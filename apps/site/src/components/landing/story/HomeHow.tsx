"use client";

import styled from "styled-components";
import { Container, Reveal, Section } from "@/components/landing/kit";
import { SectionHeader } from "@/components/landing/structure";
import { type } from "@oxumi/ui/design/typography";

// Home: how it works in three lines. The canvas itself, and the depth, live
// on /product; the demo call above already shows the steps running.

const STEPS = [
  {
    title: "Draw the call",
    text: "Lay out the questions and branches, and say what each one must collect.",
  },
  {
    title: "Test, then dial",
    text: "Try it in your browser, then point the same flow at a phone number.",
  },
  {
    title: "Collect the answers",
    text: "Every call ends in checked fields and a clear outcome.",
  },
];

export default function HomeHow() {
  return (
    <Section id="how">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            title={
              <>
                A flow, <span data-muted>not a prompt.</span>
              </>
            }
            more={{ href: "/product", label: "How it works in depth" }}
          />
        </Reveal>
        <Steps>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 100}>
                <StepTitle>
                  <i aria-hidden="true">0{i + 1}</i>
                  {step.title}
                </StepTitle>
                <StepText>{step.text}</StepText>
              </Reveal>
            </li>
          ))}
        </Steps>
      </Container>
    </Section>
  );
}

const Steps = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(12)};
  }
`;

const StepTitle = styled.h3`
  ${type("heading")}
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fg};

  i {
    ${type("title")}
    font-family: ${({ theme }) => theme.font.display};
    font-style: italic;
    font-weight: 400;
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const StepText = styled.p`
  ${type("body")}
  font-size: ${({ theme }) => theme.text.heading.size};
  line-height: ${({ theme }) => theme.text.heading.line};
  margin-top: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;
