"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Reveal } from "../kit";

// Translucent version of a token colour (or of a CSS variable holding one).
export const mix = (tokenColor: string, percent: number): string =>
  `color-mix(in srgb, ${tokenColor} ${percent}%, transparent)`;

// Pointer handler for a grid of [data-spot] tiles: writes the pointer position
// relative to every tile, so the border glow carries across neighbouring tiles.
export function useSpotlight() {
  return useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const tiles = event.currentTarget.querySelectorAll<HTMLElement>("[data-spot]");
    for (const tile of tiles) {
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      tile.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }
  }, []);
}

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(4)};
  margin-top: ${({ theme }) => theme.space(12)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: ${({ theme }) => theme.space(5)};
    margin-top: ${({ theme }) => theme.space(16)};
  }

  @media (hover: hover) {
    &:hover [data-spot]::after {
      opacity: 1;
    }
  }
`;

// Grid cell that reveals on scroll. $md / $lg are column spans out of 12.
export const Cell = styled(Reveal)<{ $md: number; $lg?: number }>`
  min-width: 0;

  ${({ theme }) => theme.media.md} {
    grid-column: span ${({ $md }) => $md};
  }
  ${({ theme }) => theme.media.lg} {
    grid-column: span ${({ $md, $lg }) => $lg ?? $md};
  }
`;

// Card surface with a tone wash, a pointer-tracking fill glow (::before) and a
// pointer-tracking border highlight (::after). Needs data-spot on the element.
export const tile = css<{ $tone: string }>`
  --tone: ${({ $tone }) => $tone};
  position: relative;
  isolation: isolate;
  height: 100%;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background:
    radial-gradient(90% 70% at 100% 0%, ${mix("var(--tone)", 9)}, transparent 70%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.color.raised},
      ${({ theme }) => theme.color.surface}
    );
  box-shadow: inset 0 1px 0 ${({ theme }) => theme.color.hover};

  &::before,
  &::after {
    content: "";
    position: absolute;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &::before {
    inset: 0;
    z-index: -1;
    background: radial-gradient(
      460px circle at var(--mx, 50%) var(--my, 0%),
      ${mix("var(--tone)", 13)},
      transparent 65%
    );
  }
  &::after {
    inset: -1px;
    padding: 1px;
    background: radial-gradient(
      340px circle at var(--mx, 50%) var(--my, 0%),
      var(--tone),
      transparent 70%
    );
    /* Keep only the 1px ring: paint everything, then cut out the content box. */
    mask:
      linear-gradient(${({ theme }) => theme.color.canvas} 0 0) content-box exclude,
      linear-gradient(${({ theme }) => theme.color.canvas} 0 0);
  }

  @media (hover: hover) {
    &:hover::before {
      opacity: 1;
    }
  }
`;

// Inset stage that holds a diagram inside a tile.
export const Stage = styled.figure`
  position: relative;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => mix(theme.color.canvas, 62)};
  padding: ${({ theme }) => theme.space(4)};

  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(5)};
  }
`;

// Every diagram carries one of these so it is never read as measured data.
export const StageNote = styled.figcaption`
  ${type("caption")}
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(4)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px dashed ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};

  b {
    ${type("overline")}
    flex: none;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

export const Pill = styled.span`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.hover};
  color: ${({ theme }) => theme.color.fgMuted};
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
`;

// Steps a looping example through `count` phases while it is on screen.
// Starts (and, with reduced motion, stays) on the last phase, which every
// example draws as its complete state.
export function usePhase<T extends HTMLElement>(count: number, ms: number) {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState(count - 1);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (!entry?.isIntersecting) return;
        setPhase(0);
        timer = window.setInterval(() => setPhase((p) => (p + 1) % count), ms);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [count, ms]);

  return [ref, phase] as const;
}
