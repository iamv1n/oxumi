"use client";

import {
  CalendarOutlined,
  CreditCardOutlined,
  HeartOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  PhoneFilled,
  ReadOutlined,
  ShopOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Reveal } from "../kit";
import { LanguageSwitch, useExampleLanguage } from "../language";
import type { ArtKey } from "./illustrations";
import { mix } from "./shared";
import { SCENARIOS } from "./useCaseData";

// The picker for the second tier of example calls. The selected
// chip is a gooey blob that stretches between chips; the panel shows how that
// call would open and which fields it would bring back.

const ICONS: Partial<Record<ArtKey, ReactNode>> = {
  pharmacy: <MedicineBoxOutlined />,
  school: <ReadOutlined />,
  society: <HomeOutlined />,
  garage: <ToolOutlined />,
  kirana: <ShopOutlined />,
  emi: <CreditCardOutlined />,
  rsvp: <CalendarOutlined />,
  donor: <HeartOutlined />,
};

const AUTO_MS = 3800;
const GOO = "closing-picker-goo";
const BLEED = 24; // room around the chips for the blur, in px

const Board = styled.div<{ $tone: string }>`
  --tone: ${({ $tone }) => $tone};
  display: grid;
  gap: ${({ theme }) => theme.space(10)};

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${({ theme }) => theme.space(16)};
    align-items: center;
  }
`;

const Wall = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2.5)};
`;

// Only the blobs live in this layer, so the filter never touches text.
const GooLayer = styled.div`
  position: absolute;
  inset: -${BLEED}px;
  filter: url(#${GOO});
  opacity: 0.3;
  pointer-events: none;
  transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const Blob = styled.span<{ $lag: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: var(--bw, 0);
  height: var(--bh, 0);
  border-radius: ${({ theme }) => theme.radius.pill};
  background: var(--tone);
  transform: translate(var(--bx, 0), var(--by, 0));
  transition-property: transform, width, height, background;
  transition-duration: ${({ $lag }) => ($lag ? "820ms" : "420ms")};
  transition-timing-function: ${({ theme }) => theme.motion.ease};
`;

const SwitchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-top: ${({ theme }) => theme.space(8)};

  > span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Chip = styled.button<{ $on: boolean }>`
  ${type("label")}
  font-size: ${({ theme }) => theme.text.body.size};
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border: 1px solid ${({ $on, theme }) => ($on ? "transparent" : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  color: ${({ $on, theme }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  .anticon {
    color: ${({ $on, theme }) => ($on ? "var(--tone)" : theme.color.fgSubtle)};
    transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover {
    border-color: ${({ $on, theme }) => ($on ? "transparent" : theme.color.lineStrong)};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;
const ring = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.1); opacity: 0; }
`;
const drain = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

const Panel = styled.div`
  position: relative;
  overflow: hidden;
  border: 1px solid ${mix("var(--tone)", 30)};
  border-radius: ${({ theme }) => theme.radius.panel};
  background:
    radial-gradient(80% 60% at 0% 0%, ${mix("var(--tone)", 14)}, transparent 70%),
    ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  transition: border-color ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease};
`;

const Timer = styled.span`
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: var(--tone);
  transform-origin: left;
  animation: ${drain} ${AUTO_MS}ms linear forwards;
`;

const Inner = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(5)};
  min-height: ${({ theme }) => theme.space(86)};
  align-content: start;
  padding: ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(8)};
  }

  > * {
    animation: ${rise} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease} backwards;
  }
  > :nth-child(2) {
    animation-delay: 90ms;
  }
  > :nth-child(3) {
    animation-delay: 180ms;
  }
`;

const Caller = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};

  small {
    ${type("overline")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  p {
    ${type("heading")}
    margin-top: ${({ theme }) => theme.space(0.5)};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Dial = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ theme }) => theme.space(11)};
  height: ${({ theme }) => theme.space(11)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: var(--tone);
  color: ${({ theme }) => theme.color.canvas};
  font-size: ${({ theme }) => theme.text.lede.size};

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px solid var(--tone);
    border-radius: inherit;
    animation: ${ring} 1.8s ${({ theme }) => theme.motion.ease} infinite;
  }
`;

const Says = styled.p<{ $hindi: boolean }>`
  ${type("lede")}
  font-family: ${({ $hindi, theme }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  border-top-left-radius: ${({ theme }) => theme.space(1)};
  background: ${({ theme }) => theme.color.overlay};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: pretty;
`;

const Fields = styled.div`
  small {
    ${type("overline")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

const Field = styled.li<{ $i: number }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${mix("var(--tone)", 30)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${mix("var(--tone)", 10)};
  color: ${({ theme }) => theme.color.fg};
  animation: ${rise} ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease}
    ${({ $i }) => 320 + $i * 110}ms backwards;

  &::before {
    content: "";
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: var(--tone);
  }
`;

const Defs = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
`;

export default function ScenarioPicker() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const wall = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const scenario = SCENARIOS[active]!;
  const { language } = useExampleLanguage();
  const hindi = language === "hi";

  // Move the blob to the selected chip (and keep it there when chips reflow).
  useLayoutEffect(() => {
    const host = wall.current!;
    const place = () => {
      const chip = chips.current[active];
      if (!chip) return;
      host.style.setProperty("--bx", `${chip.offsetLeft + BLEED}px`);
      host.style.setProperty("--by", `${chip.offsetTop + BLEED}px`);
      host.style.setProperty("--bw", `${chip.offsetWidth}px`);
      host.style.setProperty("--bh", `${chip.offsetHeight}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(host);
    return () => observer.disconnect();
  }, [active]);

  // Cycle through the examples until the visitor picks one.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % SCENARIOS.length),
      AUTO_MS,
    );
    return () => window.clearInterval(timer);
  }, [auto]);

  return (
    <>
      <Reveal>
        <Board $tone={scenario.tone}>
          <div>
            <Wall ref={wall} role="group" aria-label="Example calls">
              <GooLayer aria-hidden="true">
                <Blob $lag={false} />
                <Blob $lag />
              </GooLayer>
              {SCENARIOS.map((item, i) => (
                <Chip
                  key={item.label}
                  ref={(el) => {
                    chips.current[i] = el;
                  }}
                  type="button"
                  $on={i === active}
                  aria-pressed={i === active}
                  onClick={() => {
                    setAuto(false);
                    setActive(i);
                  }}
                >
                  {ICONS[item.art]}
                  {item.label}
                </Chip>
              ))}
            </Wall>
            <SwitchRow>
              <span>Opening line in</span>
              <LanguageSwitch />
            </SwitchRow>
          </div>

          <Panel aria-live={auto ? "off" : "polite"}>
            {auto && <Timer key={`timer-${active}`} aria-hidden="true" />}
            <Inner key={active}>
              <Caller>
                <Dial aria-hidden="true">
                  <PhoneFilled />
                </Dial>
                <div>
                  <small>Example call</small>
                  <p>{scenario.who}</p>
                </div>
              </Caller>
              <Says $hindi={hindi} lang={hindi ? "hi" : undefined}>
                &ldquo;{scenario.opening[language]}&rdquo;
              </Says>
              <Fields>
                <small>Fields it would bring back</small>
                <ul>
                  {scenario.fields.map((field, i) => (
                    <Field key={field} $i={i}>
                      {field}
                    </Field>
                  ))}
                </ul>
              </Fields>
            </Inner>
          </Panel>
        </Board>
      </Reveal>

      <Defs aria-hidden="true" focusable="false">
        <filter id={GOO}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </Defs>
    </>
  );
}
