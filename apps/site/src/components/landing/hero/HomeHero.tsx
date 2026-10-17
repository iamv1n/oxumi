"use client";

import { ArrowDownOutlined, ArrowRightOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { GradientText } from "../kit";
import { goo } from "./Goo";
import { EXAMPLE_LANGUAGES, useExampleLanguage } from "../language";
import OrbCanvas from "./OrbCanvas";
import { routes } from "@/lib/routes";

const rise = keyframes`
  from { opacity: 0; transform: translateY(28px); filter: blur(10px); }
  to { opacity: 1; transform: none; filter: none; }
`;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
`;

// Staggered entrance: each piece rises a beat after the one before it.
const enter = (step: number) => css`
  animation: ${rise} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease} both;
  animation-delay: ${250 + step * 120}ms;

  ${({ theme }) => theme.media.reducedMotion} {
    animation-delay: 0ms;
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: 4px;
    box-shadow: none;
  }
`;

// Laptop screens that are wide but short: tighten so the actions stay in view.
const short = css`
  ${({ theme }) => theme.media.md} and (max-height: ${({ theme }) => theme.space(190)})
`;

// Exactly one screen: the orb takes whatever height the copy leaves.
const Wrap = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100svh;
  padding: ${({ theme }) => theme.space(18)} ${({ theme }) => theme.layout.gutter}
    ${({ theme }) => theme.space(8)};
  overflow: hidden;
  text-align: center;

  ${({ theme }) => theme.media.md} {
    padding-top: ${({ theme }) => theme.space(20)};
    padding-bottom: ${({ theme }) => theme.space(14)};
  }
  ${short} {
    padding-bottom: ${({ theme }) => theme.space(8)};
  }
`;

// Empty box the shader orb is drawn into. It tucks behind the top of the
// copy so the orb can be larger than the space above the headline.
const Slot = styled.div`
  flex: 1;
  width: 100%;
  min-height: ${({ theme }) => theme.space(40)};
  margin-bottom: -${({ theme }) => theme.space(12)};

  ${({ theme }) => theme.media.md} {
    margin-bottom: -${({ theme }) => theme.space(22)};
  }
  ${short} {
    margin-bottom: -${({ theme }) => theme.space(16)};
  }
`;

// Melts the bottom of the shader into the page canvas.
const Floor = styled.div`
  position: absolute;
  inset: auto 0 0;
  height: 22%;
  background: linear-gradient(transparent, ${({ theme }) => theme.color.canvas});
  pointer-events: none;
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 60rem;
`;

const Chip = styled.div`
  ${type("label")}
  ${enter(0)}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(4)};
  padding-left: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.color.canvas} 60%, transparent);
  backdrop-filter: blur(12px);
  color: ${({ theme }) => theme.color.fg};

  > span:not(:first-child) {
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// One language name in the chip. The three together are the selector for the
// language of the example calls further down the page.
const Tongue = styled.button`
  ${focusRing}
  position: relative;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: none;
  color: ${({ theme }) => theme.color.fgMuted};
  font: inherit;
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  /* A dot between names. */
  & + &::before {
    content: "·";
    margin-right: ${({ theme }) => theme.space(2.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  &:hover,
  &[aria-checked="true"] {
    color: ${({ theme }) => theme.color.fg};
  }
  /* Underline for the chosen language. */
  &::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: -1px;
    width: 0;
    height: 1px;
    background: ${({ theme }) => theme.color.accent};
    transition: width ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &[aria-checked="true"]::after {
    width: 100%;
  }
  & + &[aria-checked="true"]::after {
    width: calc(100% - ${({ theme }) => theme.space(2.5)} - 0.3em);
  }
`;

// A tiny live waveform: the agent is speaking.
const Wave = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: ${({ theme }) => theme.space(3)};

  i {
    width: 2px;
    height: 100%;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
    animation: ${bounce} 1.1s ease-in-out infinite;
  }
  i:nth-child(2) { animation-delay: -0.45s; }
  i:nth-child(3) { animation-delay: -0.8s; }
  i:nth-child(4) { animation-delay: -0.2s; }
`;

const Title = styled.h1`
  ${type("hero")}
  margin-top: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fg};

  em {
    font-style: italic;
  }

  /* Keep each sentence on one line on the narrowest phones, and let the
     headline yield to the viewport height on short laptop screens. */
  font-size: min(${({ theme }) => theme.text.hero.size}, 13.3vw);

  ${({ theme }) => theme.media.md} {
    font-size: min(${({ theme }) => theme.text.hero.size}, 12.4svh);
  }
`;

const Line = styled.span<{ $step: number }>`
  display: block;
  ${({ $step }) => enter($step)}
`;

// Room around the clipped gradient so italic overhangs and descenders are
// not cut off.
const Shine = styled(GradientText)`
  display: inline-block;
  padding: 0 0.12em 0.14em;
  margin: 0 -0.12em -0.14em;
`;

const Sub = styled.p`
  ${type("lede")}
  ${enter(3)}
  max-width: 36rem;
  margin-top: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: balance;

  ${({ theme }) => theme.media.md} {
    margin-top: ${({ theme }) => theme.space(6)};
  }
  ${short} {
    margin-top: ${({ theme }) => theme.space(4)};
  }
`;

const Actions = styled.div`
  ${enter(4)}
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  margin-top: ${({ theme }) => theme.space(7)};

  ${({ theme }) => theme.media.sm} {
    gap: ${({ theme }) => theme.space(8)};
  }
  ${short} {
    margin-top: ${({ theme }) => theme.space(5)};
  }
`;

const action = css`
  ${type("heading")}
  ${focusRing}
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2.5)};
  width: 100%;
  max-width: ${({ theme }) => theme.space(80)};
  height: ${({ theme }) => theme.space(13)};
  padding-inline: ${({ theme }) => theme.space(7)};
  border-radius: ${({ theme }) => theme.radius.pill};
  white-space: nowrap;

  ${({ theme }) => theme.media.sm} {
    width: auto;
  }
  &:active {
    transform: scale(0.98);
  }
`;

// The primary action is drawn as two fused blobs: the pill, and a bead that
// carries the arrow. On hover the bead pulls out of the pill like a drop.
const Primary = styled(Link)`
  ${action}
  isolation: isolate;
  padding-right: ${({ theme }) => theme.space(14)};
  transition: transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &,
  &:hover {
    color: ${({ theme }) => theme.color.accentFg};
  }

  /* Glow, kept outside the goo layer so it stays soft. */
  &::before {
    content: "";
    position: absolute;
    inset: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)} -${({ theme }) => theme.space(1)};
    z-index: -2;
    border-radius: inherit;
    background: ${({ theme }) => theme.color.accent};
    filter: blur(22px);
    opacity: 0.4;
    transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover::before {
    opacity: 0.6;
  }
`;

const beadShift = css`
  transition: transform 520ms ${({ theme }) => theme.motion.ease};

  ${Primary}:hover &,
  ${Primary}:focus-visible & {
    transform: translateX(${({ theme }) => theme.space(6)});
  }
  ${({ theme }) => theme.media.reducedMotion} {
    ${Primary}:hover &,
    ${Primary}:focus-visible & {
      transform: none;
    }
  }
`;

const Blobs = styled.span`
  ${goo}
  position: absolute;
  inset: 0;
  z-index: -1;

  i {
    position: absolute;
    background: ${({ theme }) => theme.color.accent};
    border-radius: ${({ theme }) => theme.radius.pill};
  }
  i:first-child {
    inset: 0;
  }
  i:last-child {
    ${beadShift}
    top: ${({ theme }) => theme.space(1.5)};
    right: ${({ theme }) => theme.space(1.5)};
    width: ${({ theme }) => theme.space(10)};
    height: ${({ theme }) => theme.space(10)};
  }
`;

const Bead = styled.span`
  ${beadShift}
  position: absolute;
  top: ${({ theme }) => theme.space(1.5)};
  right: ${({ theme }) => theme.space(1.5)};
  display: grid;
  place-items: center;
  width: ${({ theme }) => theme.space(10)};
  height: ${({ theme }) => theme.space(10)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.color.accentFg} 12%, transparent);
`;

const Secondary = styled.a`
  ${action}
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  background: color-mix(in srgb, ${({ theme }) => theme.color.canvas} 45%, transparent);
  backdrop-filter: blur(12px);
  color: ${({ theme }) => theme.color.fg};
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  .anticon {
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover {
    border-color: ${({ theme }) => theme.color.fgSubtle};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  &:hover .anticon {
    transform: translateY(3px);
  }
`;

export default function HomeHero() {
  const slotRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useExampleLanguage();

  return (
    <Wrap aria-labelledby="hero-title">
      <OrbCanvas anchor={slotRef} />
      <Floor aria-hidden />
      <Slot ref={slotRef} aria-hidden />
      <Content>
        <Chip role="radiogroup" aria-label="Language of the example calls">
          <Wave aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </Wave>
          <span aria-hidden>Speaks</span>
          {EXAMPLE_LANGUAGES.map((option) => (
            <Tongue
              key={option.id}
              type="button"
              role="radio"
              aria-checked={language === option.id}
              onClick={() => setLanguage(option.id)}
            >
              {option.label}
            </Tongue>
          ))}
        </Chip>
        <Title id="hero-title">
          <Line $step={1}>Design the call.</Line>{" "}
          <Line $step={2}>
            <Shine as="em">The agent makes it.</Shine>
          </Line>
        </Title>
        <Sub>
          Draw a phone conversation as a flow. A voice agent makes the call and returns every
          answer as validated data.
        </Sub>
        <Actions>
          <Primary href={routes.signup}>
            <Blobs aria-hidden>
              <i />
              <i />
            </Blobs>
            Start building
            <Bead aria-hidden>
              <ArrowRightOutlined />
            </Bead>
          </Primary>
          <Secondary href="#demo">
            See it work <ArrowDownOutlined />
          </Secondary>
        </Actions>
      </Content>
    </Wrap>
  );
}
