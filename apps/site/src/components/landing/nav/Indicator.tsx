"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { goo } from "../hero/Goo";
import { MORPH } from "./styles";

// The nav's one liquid detail. Two blobs chase the hovered link (or rest on
// the current page) at different speeds; the goo filter fuses them, so the
// highlight stretches towards where it is going and snaps back together when
// it arrives. Moved with transforms only.

// The blobs are laid out this wide and scaled to the link they sit under.
const BASE = 100;

const Root = styled.span`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    transform ${MORPH} ${({ theme }) => theme.motion.ease};

  /* Moves with the links when the bar condenses. */
  [data-compact="true"] & {
    transform: translateX(var(--nav-links-shift, 0px));
  }
  &[data-on="true"] {
    opacity: 0.1;
  }
  /* A touch stronger while its panel is open. */
  &[data-on="true"][data-held="true"] {
    opacity: 0.14;
  }

  span {
    ${goo}
    position: absolute;
    inset: 0;
  }
  i {
    position: absolute;
    top: 50%;
    left: 0;
    width: ${BASE}px;
    height: ${({ theme }) => theme.space(8.5)};
    margin-top: -${({ theme }) => theme.space(4.25)};
    border-radius: ${({ theme }) => theme.radius.card};
    background: ${({ theme }) => theme.color.fg};
    transform-origin: 0 50%;
    transition: transform 320ms ${({ theme }) => theme.motion.ease};
  }
  i + i {
    transition-duration: 640ms;
  }
  /* Placed without travel the first time, so it never flies in from the edge. */
  &[data-placed="false"] i {
    transition: none;
  }
`;

export default function Indicator({
  items,
  at,
  held,
}: {
  // The nav's items by key, and the key of the one to sit under (null hides).
  items: RefObject<Map<string, HTMLElement>>;
  at: string | null;
  // Its panel is open.
  held: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    const el = root.current;
    const target = at ? items.current.get(at) : null;
    if (!el || !target) return;
    const place = () => {
      const transform = `translateX(${target.offsetLeft}px) scaleX(${target.offsetWidth / BASE})`;
      for (const blob of el.querySelectorAll("i")) blob.style.transform = transform;
    };
    place();
    // Let the first position paint before transitions are switched on.
    const frame = requestAnimationFrame(() => setPlaced(true));
    // Labels change width when the web font arrives.
    const observer = new ResizeObserver(place);
    observer.observe(target);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [at, items]);

  return (
    <Root ref={root} aria-hidden data-on={at !== null} data-held={held} data-placed={placed}>
      <span>
        <i />
        <i />
      </span>
    </Root>
  );
}
