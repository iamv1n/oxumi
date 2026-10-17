"use client";

import { useMemo, type CSSProperties } from "react";
import { useTheme } from "styled-components";
import { TAGLINE } from "../design/logo";
import { activeConcept } from "./active";
import { lockupOf } from "./concepts/ConceptLockup";
import { lettering } from "./concepts/lettering";
import { PROPORTION } from "./kit/compose";
import { taglinePaths } from "./kit/tagline";
import Logo, { type LogoTone } from "./Logo";
import Wordmark from "./Wordmark";

export { TAGLINE };

// Below this symbol size the tagline's capitals would be under 6 pixels
// (the whole lockup under about 140 pixels wide), so it is left out.
export const TAGLINE_MIN_SIZE = 42;

// Symbol and wordmark side by side: one image named "Oxumi". Inside a link
// that carries its own label, pass `decorative`.
export default function Lockup({
  size = 28,
  tone = "gradient",
  tagline = false,
  animated = false,
  decorative = false,
  className,
  style,
}: {
  // Height of the symbol's box in pixels; the letters scale with it.
  size?: number;
  // Tone of the symbol. The letters are the text colour, or inherit it for "mono".
  tone?: LogoTone;
  // Sets the tagline (design/logo.ts) under the name, as wide as the name.
  // Display use only: it is dropped below TAGLINE_MIN_SIZE.
  tagline?: boolean;
  animated?: boolean;
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const theme = useTheme();
  const { xHeight, gap } = lockupOf(activeConcept);
  const letters = size * xHeight;
  const spec = activeConcept.wordmark;
  // The tagline is drawn (the same paths as the exported files) to the
  // width of a drawn wordmark; a typeset wordmark has no tagline.
  const line = useMemo(() => {
    if (!tagline || size < TAGLINE_MIN_SIZE || spec.kind !== "drawn") return null;
    const art = lettering({ weight: spec.weight, x: spec.x, joined: spec.joined, cut: spec.cut });
    const width = (art.width / art.xHeight) * letters;
    const cap = letters * PROPORTION.taglineCap;
    return { width, cap, ...taglinePaths(TAGLINE, width, cap) };
  }, [tagline, size, spec, letters]);

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * gap,
        // The tagline hangs below the name; leave room for it.
        marginBottom: line ? letters * 0.3 : undefined,
        ...style,
      }}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": line ? `Oxumi. ${TAGLINE}` : "Oxumi" })}
    >
      <Logo size={size} tone={tone} animated={animated} decorative />
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Wordmark size={letters} tone={tone === "mono" ? "mono" : "solid"} decorative />
        {line && (
          <svg
            aria-hidden
            focusable="false"
            width={line.width}
            height={line.cap}
            viewBox={`0 0 ${line.width / line.scale} 10`}
            fill="none"
            style={{
              position: "absolute",
              left: 0,
              // The wordmark's box runs past the baseline by the room it
              // keeps for the dot of the i; come back up to the letters.
              top: `calc(50% + ${letters * (0.5 + PROPORTION.taglineDrop)}px)`,
              overflow: "visible",
              color: tone === "mono" ? "inherit" : theme.color.fg,
            }}
          >
            <path d={line.d} stroke="currentColor" strokeOpacity={0.86} strokeWidth={line.stroke} strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </span>
  );
}
