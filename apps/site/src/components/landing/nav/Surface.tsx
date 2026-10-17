"use client";

import type { CSSProperties } from "react";
import styled from "styled-components";
import { BAR_PX, MORPH, PANEL_MAX } from "./styles";

// The one surface behind the nav. It is laid out once, at the widest and
// tallest it can ever be, and only its clip changes: narrower when the bar
// condenses into its capsule, taller when a panel opens beneath it. Nothing
// is re-laid-out, so bar and panel read as a single shape changing size.
//
// Three layers share the clip: a blurred copy for the cast shadow, a hairline
// edge, and the fill one pixel inside it.

const Root = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  width: var(--nav-wide);
  height: ${BAR_PX + PANEL_MAX}px;
  margin-left: calc(var(--nav-wide) / -2);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    visibility 0s linear ${({ theme }) => theme.motion.base};

  /* Sides, bottom and top of the clip, and its corners. */
  --s: 0px;
  --t: 0px;
  --r: ${({ theme }) => theme.radius.island};
  --clip: inset(var(--t) var(--s) var(--b) var(--s) round var(--r));
  --clip-in: inset(
    calc(var(--t) + var(--edge-top, 1px)) calc(var(--s) + 1px) calc(var(--b) + 1px) calc(var(--s) + 1px)
      round var(--r-in, calc(${({ theme }) => theme.radius.island} - 1px))
  );

  &[data-shown="true"] {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s;
  }
  &[data-compact="true"] {
    --s: var(--nav-shift);
  }
  /* On the docs the bar is a solid strip of its own; the surface is only the
     panel hanging from its lower edge. */
  &[data-docs="true"] {
    --t: ${BAR_PX}px;
    --edge-top: 0px;
    --r: 0 0 ${({ theme }) => theme.radius.island} ${({ theme }) => theme.radius.island};
    --r-in: 0 0 calc(${({ theme }) => theme.radius.island} - 1px)
      calc(${({ theme }) => theme.radius.island} - 1px);
  }

  i {
    position: absolute;
    inset: 0;
    transition: clip-path ${MORPH} ${({ theme }) => theme.motion.ease};
  }
`;

const Shade = styled.div`
  position: absolute;
  inset: 0;
  filter: blur(22px);
  transform: translateY(${({ theme }) => theme.space(3)});

  i {
    clip-path: var(--clip);
    background: ${({ theme }) => theme.shadow.ambient};
  }
`;

const Edge = styled.i`
  clip-path: var(--clip);
  background: ${({ theme }) => theme.color.lineStrong};
`;

const Fill = styled.i`
  clip-path: var(--clip-in);
  background: color-mix(in srgb, ${({ theme }) => theme.color.surface} 90%, transparent);
  backdrop-filter: blur(16px) saturate(1.4);

  [data-docs="true"] > & {
    background: ${({ theme }) => theme.color.surface};
    backdrop-filter: none;
  }
`;

export default function Surface({
  shown,
  compact,
  docs,
  panel,
}: {
  shown: boolean;
  // Clipped in to the capsule's width.
  compact: boolean;
  docs: boolean;
  // Height of the open panel in pixels; 0 when none is open.
  panel: number;
}) {
  return (
    <Root
      aria-hidden
      data-shown={shown}
      data-compact={compact}
      data-docs={docs}
      style={{ "--b": `${PANEL_MAX - panel}px` } as CSSProperties}
    >
      <Shade>
        <i />
      </Shade>
      <Edge />
      <Fill />
    </Root>
  );
}
