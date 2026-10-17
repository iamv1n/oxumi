"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { MoreLink, SectionHeader } from "../structure";
import { ART } from "./illustrations";
import ScenarioPicker from "./ScenarioPicker";
import { mix, tile, useSpotlight } from "./shared";
import { USE_CASES } from "./useCaseData";

// The /use-cases index: the four main use cases as cards that lead to their
// own pages, then the picker with eight more.

const Cards = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(5)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

const Card = styled.article<{ $tone: string }>`
  ${tile}
  display: flex;
  flex-direction: column;
`;

const Scene = styled.div`
  display: grid;
  place-items: center;
  height: ${({ theme }) => theme.space(45)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel} ${({ theme }) => theme.radius.panel} 0 0;
  background:
    radial-gradient(60% 90% at 50% 100%, ${mix("var(--tone)", 16)}, transparent 75%),
    ${({ theme }) => mix(theme.color.canvas, 45)};

  svg {
    width: ${({ theme }) => theme.space(66)};
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  padding: ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(8)};
  }

  h3 {
    ${type("title")}
    color: ${({ theme }) => theme.color.fg};
  }
  h3 + p {
    ${type("label")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: var(--tone);
  }
`;

const Pitch = styled.p`
  ${type("body")}
  font-size: ${({ theme }) => theme.text.heading.size};
  line-height: ${({ theme }) => theme.text.heading.line};
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
  margin-block: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)};

  li {
    ${type("caption")}
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${mix("var(--tone)", 28)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${mix("var(--tone)", 9)};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Foot = styled.div`
  margin-top: auto;
`;

export default function UseCasesFull() {
  const onPointerMove = useSpotlight();

  return (
    <>
      <Section id="main">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Start here"
              title="Four calls, each with its own page."
              lede="The call itself, the fields it returns, how to set it up, and what to watch for."
            />
          </Reveal>
          <Cards onPointerMove={onPointerMove}>
            {USE_CASES.map((item, i) => {
              const Art = ART[item.art];
              return (
                <Reveal key={item.slug} delay={(i % 2) * 120}>
                  <Card $tone={item.tone} data-spot>
                    <Scene>
                      <Art />
                    </Scene>
                    <Body>
                      <h3>{item.sector}</h3>
                      <p>{item.call}</p>
                      <Pitch>{item.pitch}</Pitch>
                      <Chips aria-label="Fields it collects">
                        {item.fields.map(([field]) => (
                          <li key={field}>{field}</li>
                        ))}
                      </Chips>
                      <Foot>
                        <MoreLink href={`/use-cases/${item.slug}`}>{item.sector} in depth</MoreLink>
                      </Foot>
                    </Body>
                  </Card>
                </Reveal>
              );
            })}
          </Cards>
        </Container>
      </Section>

      <Section id="more">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Eight more"
              title={
                <>
                  What would <em>you</em> call about?
                </>
              }
              lede="Pick one. See how it opens and what it would bring back."
            />
          </Reveal>
          <ScenarioPicker />
        </Container>
      </Section>
    </>
  );
}
