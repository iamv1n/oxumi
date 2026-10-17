"use client";

import type { CSSProperties } from "react";
import { useTheme } from "styled-components";
import { activeConcept } from "./active";
import WordmarkArt from "./concepts/WordmarkArt";
import type { LogoTone } from "./Logo";

// The name "oxumi" as the live concept sets it.
//   solid:    the theme's text colour (the default), with the concept's own
//             colour on the dot of the i if it has one.
//   mono:     whatever the surrounding text colour is, dot included.
//   gradient: the brand gradient across the letters, for display use.
export default function Wordmark({
  size = 14,
  tone = "solid",
  decorative = false,
  className,
  style,
}: {
  // Height of the lowercase letters in pixels. The box is taller: it leaves
  // room for the dot of the i, and the same below, so it centres on the letters.
  size?: number;
  tone?: LogoTone;
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { color } = useTheme();
  return (
    <WordmarkArt
      spec={activeConcept.wordmark}
      xHeight={size}
      color={tone === "solid" ? color.fg : "currentColor"}
      plain={tone === "mono"}
      gradient={tone === "gradient" ? [color.accent, color.pink, color.violet] : undefined}
      label={decorative ? undefined : "Oxumi"}
      className={className}
      style={style}
    />
  );
}
