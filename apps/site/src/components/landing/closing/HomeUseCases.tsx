"use client";

import { ArrowRightOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import Link from "next/link";
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { SectionHeader } from "../structure";
import { ART, type ArtKey } from "./illustrations";
import { mix, tile, useSpotlight } from "./shared";
import { SCENARIOS, USE_CASES } from "./useCaseData";

// Home: a sliding row of compact use-case previews. Depth lives on /use-cases.

interface Preview {
  key: string;
  href: string;
  art: ArtKey;
  tone: string;
  name: string;
  line: string;
  chips: string[];
}

const PREVIEWS: Preview[] = [
  ...USE_CASES.map((item) => ({
    key: item.slug,
    href: `/use-cases/${item.slug}`,
    art: item.art,
    tone: item.tone,
    name: item.sector,
    line: item.line,
    chips: item.chips,
  })),
  ...SCENARIOS.map((item) => ({
    key: item.art,
    href: "/use-cases",
    art: item.art,
    tone: item.tone,
    name: item.label,
    line: item.line,
    chips: item.fields.slice(0, 3),
  })),
];

const GOO = "home-use-cases-goo";
const CARD = 300; // px, card width
const GAP = 16; // px, gap between cards

const Track = styled.div`
  display: flex;
  gap: ${GAP}px;
  margin-inline: calc(${({ theme }) => theme.layout.gutter} * -1);
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.layout.gutter};
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: ${({ theme }) => theme.layout.gutter};
  scrollbar-width: none;
  cursor: grab;
  border-radius: ${({ theme }) => theme.radius.panel};
  /* Cards fade out at the right edge, where the next one peeks in. */
  mask-image: linear-gradient(
    to right,
    transparent,
    ${({ theme }) => theme.color.canvas} ${({ theme }) => theme.layout.gutter},
    ${({ theme }) => theme.color.canvas} calc(100% - ${({ theme }) => theme.space(20)}),
    transparent
  );

  &::-webkit-scrollbar {
    display: none;
  }
  &[data-dragging="true"] {
    scroll-snap-type: none;
    cursor: grabbing;
    user-select: none;
  }
  &[data-dragging="true"] a {
    pointer-events: none;
  }
  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

const Card = styled(Link)<{ $tone: string }>`
  ${tile}
  display: flex;
  flex: none;
  flex-direction: column;
  width: min(${CARD}px, 78vw);
  height: auto;
  scroll-snap-align: start;
  color: inherit;
  transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: inherit;
  }
  @media (hover: hover) {
    &:hover {
      transform: translateY(-3px);
    }
  }
`;

const Scene = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  height: ${({ theme }) => theme.space(29)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel} ${({ theme }) => theme.radius.panel} 0 0;
  background:
    radial-gradient(60% 90% at 50% 100%, ${mix("var(--tone)", 16)}, transparent 75%),
    ${({ theme }) => mix(theme.color.canvas, 45)};

  svg {
    width: ${({ theme }) => theme.space(42)};
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(5)};
`;

const Name = styled.h3`
  ${type("heading")}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fg};

  .anticon {
    color: var(--tone);
    font-size: ${({ theme }) => theme.text.body.size};
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  ${Card}:hover & .anticon {
    transform: translateX(3px);
  }
`;

const Line = styled.p`
  ${type("body")}
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space(4)};

  li {
    ${type("caption")}
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${mix("var(--tone)", 28)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${mix("var(--tone)", 9)};
    color: ${({ theme }) => theme.color.fg};
    white-space: nowrap;
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(6)};
  margin-top: ${({ theme }) => theme.space(6)};
`;

// Progress: a row of dots and one blob that swallows them as the row slides.
// Only shapes are inside the goo filter.
const Progress = styled.div`
  position: relative;
  width: ${({ theme }) => theme.space(44)};
  height: ${({ theme }) => theme.space(6)};
  filter: url(#${GOO});

  i {
    position: absolute;
    top: 50%;
    width: ${({ theme }) => theme.space(2)};
    height: ${({ theme }) => theme.space(2)};
    margin: ${({ theme }) => theme.space(-1)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.fgSubtle};
  }
  b {
    position: absolute;
    top: 50%;
    left: calc(var(--p, 0) * (100% - ${({ theme }) => theme.space(8)}));
    width: ${({ theme }) => theme.space(8)};
    height: ${({ theme }) => theme.space(3)};
    margin-top: ${({ theme }) => theme.space(-1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
  }
`;

const Arrows = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};

  button {
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(10)};
    height: ${({ theme }) => theme.space(10)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: none;
    color: ${({ theme }) => theme.color.fg};
    cursor: pointer;
    transition:
      background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
      opacity ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
  }
  button:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.hover};
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const Defs = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
`;

export default function HomeUseCases() {
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, left: 0 });
  const [edge, setEdge] = useState<"start" | "middle" | "end">("start");
  const spotlight = useSpotlight();

  useEffect(() => {
    const el = track.current!;
    const sync = () => {
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 0;
      progress.current?.style.setProperty("--p", p.toFixed(4));
      setEdge(p < 0.01 ? "start" : p > 0.99 ? "end" : "middle");
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const slide = (cards: number) => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollBy({ left: cards * (CARD + GAP), behavior: smooth ? "smooth" : "auto" });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    slide(event.key === "ArrowRight" ? 1 : -1);
  };

  // Mouse drag-to-slide. Touch and trackpads already scroll natively.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { active: true, moved: false, x: event.clientX, left: event.currentTarget.scrollLeft };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    spotlight(event);
    const state = drag.current;
    if (!state.active) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < 5) return;
    state.moved = true;
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.scrollLeft = state.left - dx;
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    delete event.currentTarget.dataset.dragging;
  };
  // A drag must not count as a click on the card under the pointer.
  const onClickCapture = (event: MouseEvent) => {
    if (!drag.current.moved) return;
    drag.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Section id="use-cases">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Use cases"
            title={
              <>
                One engine. <span data-muted>Whatever your calls are about.</span>
              </>
            }
            more={{ href: "/use-cases", label: "All use cases" }}
          />
        </Reveal>

        <Reveal>
          <Track
            ref={track}
            role="region"
            aria-label="Use cases. Use the arrow keys to slide."
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onClickCapture={onClickCapture}
          >
            {PREVIEWS.map((item) => {
              const Art = ART[item.art];
              return (
                <Card key={item.key} href={item.href} $tone={item.tone} data-spot draggable={false}>
                  <Scene>
                    <Art />
                  </Scene>
                  <Body>
                    <Name>
                      {item.name}
                      <ArrowRightOutlined aria-hidden="true" />
                    </Name>
                    <Line>{item.line}</Line>
                    <Chips aria-label="Fields it collects">
                      {item.chips.map((chip) => (
                        <li key={chip}>{chip}</li>
                      ))}
                    </Chips>
                  </Body>
                </Card>
              );
            })}
          </Track>

          <Controls>
            <Progress ref={progress} aria-hidden="true">
              {PREVIEWS.map((item, i) => (
                <i key={item.key} style={{ left: `${((i + 0.5) / PREVIEWS.length) * 100}%` }} />
              ))}
              <b />
            </Progress>
            <Arrows>
              <button type="button" aria-label="Previous use cases" disabled={edge === "start"} onClick={() => slide(-2)}>
                <LeftOutlined aria-hidden="true" />
              </button>
              <button type="button" aria-label="More use cases" disabled={edge === "end"} onClick={() => slide(2)}>
                <RightOutlined aria-hidden="true" />
              </button>
            </Arrows>
          </Controls>
        </Reveal>
      </Container>

      <Defs aria-hidden="true" focusable="false">
        <filter id={GOO} x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -6" />
        </filter>
      </Defs>
    </Section>
  );
}
