"use client";

import type { CSSProperties } from "react";
import { useTheme } from "styled-components";
import { activeConcept } from "./active";
import Mark, { type Paint } from "./concepts/Mark";

// gradient: the mark in colour. The chosen mark carries its own blues and
//           keeps them in every theme; an exploration without colours of its
//           own takes the theme's gradient.
// solid:    one flat colour, the theme's accent.
// mono:     whatever the surrounding text colour is.
export type LogoTone = "gradient" | "solid" | "mono";

// Colours come from the theme as CSS variables, so the mark follows light and
// dark mode without re-rendering.
export function usePaint(tone: LogoTone): Paint {
  const { color } = useTheme();
  if (tone === "gradient") return { type: "gradient", stops: [color.accent, color.pink, color.violet] };
  return { type: "flat", color: tone === "solid" ? color.accentLine : "currentColor" };
}

// The Oxumi symbol. Alone it is an image named "Oxumi"; pass `decorative`
// when the name is already there in text or on the link around it.
export default function Logo({
  size = 28,
  tone = "gradient",
  animated = false,
  decorative = false,
  className,
  style,
}: {
  // Height and width in pixels.
  size?: number;
  tone?: LogoTone;
  // A one-off entrance for marketing pages. Off under reduced motion.
  animated?: boolean;
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const paint = usePaint(tone);
  return (
    <Mark
      concept={activeConcept}
      size={size}
      paint={paint}
      animated={animated}
      label={decorative ? undefined : "Oxumi"}
      className={className}
      style={style}
    />
  );
}
