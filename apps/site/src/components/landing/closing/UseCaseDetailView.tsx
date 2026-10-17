"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import styled, { keyframes } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { LanguageSwitch, useExampleLanguage } from "../language";
import { MoreLink, PageIntro, SectionHeader } from "../structure";
import { ART } from "./illustrations";
import { mix, Pill } from "./shared";
import { type Slug, USE_CASES, useCaseBySlug } from "./useCaseData";

// One use case in depth: the problem, the call, what comes back, how to set
// it up, and what to watch for. All content comes from ./useCaseData.

const Page = styled.div<{ $tone: string }>`
  --tone: ${({ $tone }) => $tone};
`;

// ---- The problem ------------------------------------------------------------

const Points = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(10)};
  }

  li {
    padding-top: ${({ theme }) => theme.space(5)};
    border-top: 1px solid ${({ theme }) => theme.color.lineStrong};
  }
  small {
    ${type("code")}
    color: var(--tone);
  }
  h3 {
    ${type("title")}
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
  p {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

// ---- The call ---------------------------------------------------------------

const CallLayout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: ${({ theme }) => theme.space(14)};
    align-items: start;
  }
`;

const Thread = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

const SwitchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(6)};

  > span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Turn = styled.li<{ $caller: boolean; $hindi: boolean }>`
  ${type("lede")}
  font-family: ${({ $hindi, theme }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  justify-self: ${({ $caller }) => ($caller ? "end" : "start")};
  max-width: min(34rem, 90%);
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border: 1px solid ${({ $caller, theme }) => ($caller ? mix("var(--tone)", 35) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.panel};
  ${({ $caller, theme }) =>
    $caller
      ? `border-bottom-right-radius: ${theme.space(1)};`
      : `border-bottom-left-radius: ${theme.space(1)};`}
  background: ${({ $caller, theme }) => ($caller ? mix("var(--tone)", 12) : theme.color.raised)};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: pretty;

  small {
    ${type("overline")}
    display: block;
    font-family: ${({ theme }) => theme.font.sans};
    margin-bottom: ${({ theme }) => theme.space(0.5)};
    color: ${({ $caller, theme }) => ($caller ? "var(--tone)" : theme.color.fgSubtle)};
  }
`;

const SceneCard = styled.figure`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background:
    radial-gradient(70% 70% at 50% 100%, ${mix("var(--tone)", 18)}, transparent 75%),
    ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.lg} {
    position: sticky;
    top: ${({ theme }) => theme.space(28)};
  }

  div {
    display: grid;
    place-items: center;
    padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(8)};
  }
  svg {
    max-width: ${({ theme }) => theme.space(80)};
  }
  figcaption {
    ${type("caption")}
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
    border-top: 1px dashed ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  figcaption b {
    ${type("overline")}
    margin-right: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// ---- What comes back --------------------------------------------------------

const fill = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: none; }
`;

// Drawn as a call slip: a stub header torn off from the answers by two notches.
const Slip = styled.div`
  position: relative;
  max-width: 44rem;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.color.surface};
`;

const SlipHead = styled.div`
  ${type("overline")}
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(6)};
  border-bottom: 1px dashed ${({ theme }) => theme.color.lineStrong};
  color: ${({ theme }) => theme.color.fgMuted};

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 100%;
    width: ${({ theme }) => theme.space(5)};
    height: ${({ theme }) => theme.space(5)};
    margin-top: ${({ theme }) => theme.space(-2.5)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.canvas};
  }
  &::before {
    left: ${({ theme }) => theme.space(-2.5)};
  }
  &::after {
    right: ${({ theme }) => theme.space(-2.5)};
  }
`;

const Rows = styled.dl`
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(6)};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  padding-block: ${({ theme }) => theme.space(4)};

  & + & {
    border-top: 1px dashed ${({ theme }) => theme.color.line};
  }

  dt {
    ${type("label")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};
    border: 1px solid ${mix("var(--tone)", 28)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${mix("var(--tone)", 9)};
    color: ${({ theme }) => theme.color.fg};
  }
  dt::before {
    content: "";
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: var(--tone);
  }
`;

const Value = styled.dd<{ $i: number }>`
  ${type("code")}
  font-size: ${({ theme }) => theme.text.heading.size};
  margin-left: auto;
  color: ${({ theme }) => theme.color.fg};
  text-align: right;
  opacity: 0;

  [data-in="true"] & {
    animation: ${fill} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease}
      ${({ $i }) => 300 + $i * 260}ms forwards;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }
`;

// ---- How you'd set it up ----------------------------------------------------

const Steps = styled.ol`
  display: grid;
  max-width: 48rem;
`;

const Step = styled.li<{ $kind: string }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space(16)} minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(5)};
  padding-bottom: ${({ theme }) => theme.space(6)};

  /* The rail that joins one step to the next. */
  &:not(:last-child)::before {
    content: "";
    position: absolute;
    top: ${({ theme }) => theme.space(8)};
    bottom: 0;
    left: ${({ theme }) => theme.space(8)};
    border-left: 1px dashed ${({ theme }) => theme.color.lineStrong};
  }

  i {
    ${type("code")}
    position: relative;
    align-self: start;
    padding-block: ${({ theme }) => theme.space(1.5)};
    border: 1px solid ${({ $kind }) => mix($kind, 45)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.surface};
    box-shadow: inset 0 0 0 ${({ theme }) => theme.space(10)} ${({ $kind }) => mix($kind, 10)};
    color: ${({ $kind }) => $kind};
    font-style: normal;
    text-align: center;
  }
  b {
    ${type("code")}
    display: block;
    color: ${({ theme }) => theme.color.fg};
    font-weight: ${({ theme }) => theme.text.label.weight};
  }
  p {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(0.5)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

// ---- What to watch for ------------------------------------------------------

const Cautions = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  li {
    padding: ${({ theme }) => theme.space(6)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.panel};
    background: ${({ theme }) => theme.color.surface};
  }
  .anticon {
    color: ${({ theme }) => theme.color.warning};
    font-size: ${({ theme }) => theme.text.title.size};
  }
  h3 {
    ${type("heading")}
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const Early = styled.p`
  ${type("body")}
  margin-top: ${({ theme }) => theme.space(6)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Others = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(8)};
  margin-top: ${({ theme }) => theme.space(14)};
  padding-top: ${({ theme }) => theme.space(8)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const KIND = {
  say: color.node.say,
  ask: color.node.ask,
  branch: color.node.branch,
  end: color.node.end,
} as const;

export default function UseCaseDetailView({ slug }: { slug: Slug }) {
  const item = useCaseBySlug(slug);
  const Art = ART[item.art];
  const { language } = useExampleLanguage();
  const hindi = language === "hi";

  return (
    <Page $tone={item.tone}>
      <PageIntro eyebrow={item.sector} title={item.promise} lede={item.intro} />

      <Section id="problem">
        <Container>
          <Reveal>
            <SectionHeader eyebrow="The problem" title={item.problem.title} />
          </Reveal>
          <Reveal>
            <Points>
              {item.problem.points.map(([title, body], i) => (
                <li key={title}>
                  <small>0{i + 1}</small>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </Points>
          </Reveal>
        </Container>
      </Section>

      <Section id="call">
        <Container>
          <Reveal>
            <SectionHeader eyebrow={`The call · ${item.call}`} title={item.callTitle} />
          </Reveal>
          <CallLayout>
            <Reveal>
              <SwitchRow>
                <span>Hear this call in</span>
                <LanguageSwitch />
              </SwitchRow>
              <Thread aria-label="Example exchange" lang={hindi ? "hi" : undefined}>
                {item.turns.map(([who, text], i) => (
                  <Turn key={i} $caller={who === "caller"} $hindi={hindi}>
                    <small lang="en">{who === "caller" ? "Caller" : "Agent"}</small>
                    {text[language]}
                  </Turn>
                ))}
              </Thread>
            </Reveal>
            <SceneCard>
              <div>
                <Art />
              </div>
              <figcaption>
                <b>Example</b>
                An illustrative exchange, not a recording.
              </figcaption>
            </SceneCard>
          </CallLayout>
        </Container>
      </Section>

      <Section id="result">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="What comes back"
              title={item.resultTitle}
              lede="Each answer is checked against its field before it is kept."
            />
          </Reveal>
          <Reveal>
            <Slip>
              <SlipHead>
                After the call above
                <Pill>Example</Pill>
              </SlipHead>
              <Rows>
                {item.fields.map(([field, example], i) => (
                  <Row key={field}>
                    <dt>{field}</dt>
                    <Value $i={i}>{example}</Value>
                  </Row>
                ))}
              </Rows>
            </Slip>
          </Reveal>
        </Container>
      </Section>

      <Section id="setup">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="How you'd set it up"
              title={item.setupTitle}
              lede="Step names are illustrative. You draw and name your own."
            />
          </Reveal>
          <Reveal>
            <Steps>
              {item.steps.map(([kind, name, text]) => (
                <Step key={name} $kind={KIND[kind]}>
                  <i>{kind}</i>
                  <div>
                    <b>{name}</b>
                    <p>{text}</p>
                  </div>
                </Step>
              ))}
            </Steps>
          </Reveal>
        </Container>
      </Section>

      <Section id="watch">
        <Container>
          <Reveal>
            <SectionHeader eyebrow="What to watch for" title={item.watchTitle} />
          </Reveal>
          <Reveal>
            <Cautions>
              {item.watch.map(([title, body]) => (
                <li key={title}>
                  <ExclamationCircleOutlined aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </Cautions>
            <Early>
              This is an early build. Run the flow against your own team before a real caller
              hears it.
            </Early>
          </Reveal>

          <Others aria-label="Other use cases">
            <span>Next</span>
            {USE_CASES.filter((other) => other.slug !== slug).map((other) => (
              <MoreLink key={other.slug} href={`/use-cases/${other.slug}`}>
                {other.sector}
              </MoreLink>
            ))}
            <MoreLink href="/use-cases">All use cases</MoreLink>
          </Others>
        </Container>
      </Section>
    </Page>
  );
}
