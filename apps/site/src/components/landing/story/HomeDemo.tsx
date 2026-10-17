"use client";

import styled from "styled-components";
import { Container, Reveal, Section } from "@/components/landing/kit";
import { SectionHeader } from "@/components/landing/structure";
import DemoCall from "./DemoCall";

// Home: the page's one proof moment. The window does the explaining.
export default function HomeDemo() {
  return (
    <Section id="demo">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="A call, start to finish"
            title={
              <>
                It sounds like a conversation. <Second data-muted>It lands as data.</Second>
              </>
            }
          />
        </Reveal>
        <Reveal delay={120}>
          <DemoCall />
        </Reveal>
      </Container>
    </Section>
  );
}

// The second sentence takes its own line until the title fits on one.
const Second = styled.span`
  display: block;

  ${({ theme }) => theme.media.lg} {
    display: inline;
  }
`;
