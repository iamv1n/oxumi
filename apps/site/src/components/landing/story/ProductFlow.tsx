"use client";

import styled from "styled-components";
import { Container, Reveal, Section } from "@/components/landing/kit";
import { SectionHeader } from "@/components/landing/structure";
import FlowCanvas from "./FlowCanvas";
import Ledger from "./Ledger";
import Steps from "./Steps";

// Product page: the canvas in full, the three steps with their illustrations,
// and what comes back from a call.
export default function ProductFlow() {
  return (
    <>
      <Section id="canvas">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="The canvas"
              title={
                <>
                  The drawing <span data-muted>is the program.</span>
                </>
              }
              lede="Each box is a step with one job: say a line, ask for a field, or pick a path. Select one to see exactly what it will collect."
            />
          </Reveal>
          <Reveal delay={120}>
            <FlowCanvas />
          </Reveal>
        </Container>
      </Section>

      <Section id="steps">
        <Container>
          <Reveal>
            <SectionHeader eyebrow="From canvas to call" title="Design. Call. Collect." />
          </Reveal>
          <Steps />
        </Container>
      </Section>

      <Section id="result">
        <Container>
          <Split>
            <Reveal>
              <SectionHeader
                eyebrow="What you get back"
                title={
                  <>
                    Said any way. <span data-muted>Stored one way.</span>
                  </>
                }
                lede="People answer however they like. A field keeps one typed value, and an answer that does not fit is asked for again."
              />
            </Reveal>
            <Reveal delay={160}>
              <Ledger />
            </Reveal>
          </Split>
        </Container>
      </Section>
    </>
  );
}

const Split = styled.div`
  display: grid;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    align-items: center;
    gap: ${({ theme }) => theme.space(16)};

    /* The header's own bottom margin is for stacked layouts. */
    & > :first-child > * {
      margin-bottom: 0;
    }
  }
`;
