"use client";

import { useId, useMemo, type CSSProperties } from "react";
import styled from "styled-components";
import { lettering } from "./lettering";
import type { WordmarkSpec } from "./types";

const Text = styled.span`
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
`;

// The name, set the way a concept specifies: drawn letters or a typeface.
// `xHeight` is the height of the lowercase letters in pixels; the box is
// centred on them, so it lines up with a mark under `align-items: center`.
export default function WordmarkArt({
  spec,
  xHeight,
  color = "currentColor",
  dotColor,
  plain = false,
  gradient,
  label,
  className,
  style,
}: {
  spec: WordmarkSpec;
  xHeight: number;
  color?: string;
  // Accent for the dot of the i (drawn wordmarks only).
  dotColor?: string;
  // One colour throughout: ignore the concept's own dot colour.
  plain?: boolean;
  // Paints the letters with a left-to-right gradient instead of `color`.
  gradient?: readonly [string, string, string];
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const art = useMemo(
    () => (spec.kind === "drawn" ? lettering({ weight: spec.weight, x: spec.x, joined: spec.joined, cut: spec.cut }) : null),
    [spec],
  );
  const id = useId();
  const naming = label ? ({ role: "img", "aria-label": label } as const) : ({ "aria-hidden": true } as const);

  if (spec.kind === "text" || !art) {
    if (spec.kind !== "text") return null;
    return (
      <Text
        className={className}
        style={{
          fontFamily: spec.face === "serif" ? "var(--font-instrument-serif), Georgia, serif" : "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: xHeight * spec.em,
          fontWeight: spec.weight,
          letterSpacing: spec.tracking,
          transform: `translateY(${spec.shift}em)`,
          color,
          ...(gradient && {
            backgroundImage: `linear-gradient(90deg, ${gradient.join(", ")})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }),
          ...style,
        }}
        {...naming}
      >
        {spec.text}
      </Text>
    );
  }

  const dot = plain ? undefined : (dotColor ?? (spec.kind === "drawn" ? spec.dot : undefined));
  const ink = gradient ? `url(#${id})` : "currentColor";
  const scale = xHeight / art.xHeight;
  const height = art.xHeight + 2 * art.pad;
  return (
    <svg
      className={className}
      style={{ display: "block", flex: "none", color, ...style }}
      width={art.width * scale}
      height={height * scale}
      viewBox={`0 ${-height / 2} ${art.width} ${height}`}
      fill="none"
      focusable="false"
      {...naming}
    >
      {gradient && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={art.width} y2={0}>
            <stop style={{ stopColor: gradient[0] }} />
            <stop offset="0.5" style={{ stopColor: gradient[1] }} />
            <stop offset="1" style={{ stopColor: gradient[2] }} />
          </linearGradient>
        </defs>
      )}
      {art.shapes.map((shape, index) =>
        shape.kind === "stroke" ? (
          <path key={index} d={shape.d} stroke={ink} strokeWidth={shape.width} strokeLinejoin="round" />
        ) : (
          <path key={index} d={shape.d} fill={ink} />
        ),
      )}
      <path d={art.dot.d} fill={ink} style={dot ? { fill: dot } : undefined} />
    </svg>
  );
}
