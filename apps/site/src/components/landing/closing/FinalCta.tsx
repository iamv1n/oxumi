"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { Container, GradientText, Heading, Reveal, Section } from "../kit";
import { mix } from "./shared";
import { routes } from "@/lib/routes";

// The closing call to action: one panel, lit from its top corner. On the home
// page it pairs the ask with what happens next (a test call and the three
// things you do). Inner pages pass `compact` and get the ask alone, on one line.

// Bar heights of the test-call waveform, as a percentage of its height.
const WAVE = [
  22, 38, 30, 56, 44, 72, 50, 86, 62, 40, 68, 94, 58, 76, 46, 82, 64, 36, 54, 88, 60, 42, 70, 52, 30,
  66, 84, 48, 74, 38, 58, 26, 46, 34, 20, 28,
];
const WAVE_TONES = [color.accent, color.pink, color.violet];

const STEPS = [
  { title: "Draw a flow", text: "Questions, branches and the fields to collect." },
  { title: "Play the caller", text: "Talk to it in your browser before anyone else does." },
  { title: "Watch the answers fill in", text: "Each reply lands as a checked field." },
];

const talk = keyframes`
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(1); }
`;

const Wrap = styled(Section)<{ $compact: boolean }>`
  padding-block: ${({ theme, $compact }) => theme.space($compact ? 8 : 12)};

  ${({ theme }) => theme.media.md} {
    padding-block: ${({ theme, $compact }) => theme.space($compact ? 10 : 20)};
  }
`;

const Panel = styled.div<{ $compact: boolean }>`
  position: relative;
  isolation: isolate;
  overflow: clip;
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
  padding: ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background:
    radial-gradient(55% 90% at 100% 0%, ${({ theme }) => mix(theme.color.violet, 18)}, transparent 70%),
    radial-gradient(45% 80% at 68% 0%, ${({ theme }) => mix(theme.color.pink, 10)}, transparent 70%),
    radial-gradient(40% 70% at 0% 100%, ${({ theme }) => mix(theme.color.accent, 8)}, transparent 70%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.color.raised},
      ${({ theme }) => theme.color.surface}
    );
  box-shadow: inset 0 1px 0 ${({ theme }) => theme.color.hover};

  /* A hairline in the brand gradient along the top edge. */
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 1px;
    background: ${({ theme }) => theme.gradient.brand};
    mask-image: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.color.canvas} 25%,
      ${({ theme }) => theme.color.canvas} 75%,
      transparent
    );
    opacity: 0.8;
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: ${({ $compact }) =>
      $compact ? "minmax(0, 1fr) auto" : "minmax(0, 6fr) minmax(0, 5fr)"};
    align-items: center;
    gap: ${({ theme, $compact }) => theme.space($compact ? 8 : 14)};
    padding: ${({ theme, $compact }) =>
      $compact ? `${theme.space(8)} ${theme.space(10)}` : theme.space(14)};
  }
`;

const Title = styled(Heading)`
  margin-top: 0;
`;

const SmallTitle = styled.h2`
  font-family: ${({ theme }) => theme.font.display};
  font-size: calc(${({ theme }) => theme.text.display.size} * 0.62);
  line-height: ${({ theme }) => theme.text.display.line};
  font-weight: ${({ theme }) => theme.text.display.weight};
  color: ${({ theme }) => theme.color.fg};
`;

const Line = styled.p<{ $compact: boolean }>`
  ${({ $compact }) => type($compact ? "body" : "lede")}
  max-width: 28rem;
  margin-top: ${({ theme, $compact }) => theme.space($compact ? 2 : 5)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(6)};
  margin-top: ${({ theme }) => theme.space(8)};
`;

const Action = styled(Link)<{ $compact?: boolean }>`
  ${({ $compact }) => type($compact ? "label" : "heading")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme, $compact }) =>
    $compact ? `${theme.space(3)} ${theme.space(6)}` : `${theme.space(4)} ${theme.space(7)}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.fg};
  color: ${({ theme }) => theme.color.canvas};
  white-space: nowrap;
  transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  .anticon {
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover {
    color: ${({ theme }) => theme.color.canvas};
    transform: scale(1.03);
  }
  &:hover .anticon {
    transform: translateX(4px);
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.fg};
    outline-offset: 4px;
  }
`;

const SignIn = styled.p`
  ${type("body")}
  color: ${({ theme }) => theme.color.fgMuted};

  a {
    padding: ${({ theme }) => theme.space(1)};
    border-radius: ${({ theme }) => theme.radius.control};
    color: ${({ theme }) => theme.color.fg};
    font-weight: ${({ theme }) => theme.text.label.weight};
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.color.lineStrong};
    text-underline-offset: 4px;
    transition: text-decoration-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
  }
  a:hover {
    color: ${({ theme }) => theme.color.fg};
    text-decoration-color: ${({ theme }) => theme.color.accentLine};
  }
`;

// What "hear it" means: a test call, then the three things you do.
const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => mix(theme.color.canvas, 62)};
`;

const CardHead = styled.div`
  ${type("caption")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgMuted};

  &::before {
    content: "";
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.success};
  }
  span {
    margin-left: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Wave = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${({ theme }) => theme.space(18)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};

  i {
    width: 3px;
    border-radius: ${({ theme }) => theme.radius.pill};
  }
  /* The bars move while the panel is hovered; at rest the waveform is a still. */
  ${Panel}:hover & i {
    animation: ${talk} 1.2s ease-in-out infinite;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    ${Panel}:hover & i {
      animation: none;
    }
  }
`;

const Steps = styled.ol`
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  i {
    ${type("title")}
    grid-row: span 2;
    font-family: ${({ theme }) => theme.font.display};
    font-style: italic;
    font-weight: 400;
    color: ${({ theme }) => theme.color.accentText};
  }
  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

export default function FinalCta({ compact = false }: { compact?: boolean }) {
  return (
    <Wrap id="start" aria-labelledby="start-heading" $compact={compact}>
      <Container>
        <Reveal>
          <Panel $compact={compact}>
            <div>
              {compact ? (
                <SmallTitle id="start-heading">Hear it for yourself.</SmallTitle>
              ) : (
                <Title id="start-heading">
                  Hear it{" "}
                  <GradientText>
                    <em>for yourself.</em>
                  </GradientText>
                </Title>
              )}
              <Line $compact={compact}>
                {compact
                  ? "Draw a flow. Play the caller. Watch the answers fill in."
                  : "Sign up, draw a flow and talk to it in your browser."}
              </Line>
              {!compact && (
                <Actions>
                  <Action href={routes.signup}>
                    Get started
                    <ArrowRightOutlined aria-hidden="true" />
                  </Action>
                  <SignIn>
                    Have an account? <Link href={routes.login}>Sign in</Link>
                  </SignIn>
                </Actions>
              )}
            </div>

            {compact ? (
              <Action href={routes.signup} $compact>
                Get started
                <ArrowRightOutlined aria-hidden="true" />
              </Action>
            ) : (
              <Card>
                <CardHead>
                  Test call
                  <span>In your browser</span>
                </CardHead>
                <Wave aria-hidden="true">
                  {WAVE.map((height, i) => (
                    <i
                      key={i}
                      style={{
                        height: `${height}%`,
                        background: WAVE_TONES[Math.floor((i / WAVE.length) * WAVE_TONES.length)],
                        animationDelay: `${i * -90}ms`,
                      }}
                    />
                  ))}
                </Wave>
                <Steps>
                  {STEPS.map((step, i) => (
                    <li key={step.title}>
                      <i aria-hidden="true">0{i + 1}</i>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </li>
                  ))}
                </Steps>
              </Card>
            )}
          </Panel>
        </Reveal>
      </Container>
    </Wrap>
  );
}
