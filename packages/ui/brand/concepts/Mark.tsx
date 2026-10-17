"use client";

import { useId, type CSSProperties } from "react";
import styled, { css, keyframes } from "styled-components";
import type { Concept, MarkArt } from "./types";

// How a mark is coloured. Colours are CSS colour strings and are applied
// through `style`, so they may be design tokens (CSS variables).
export type Paint =
  | { type: "gradient"; stops: readonly [string, string, string] }
  | { type: "flat"; color: string };

const draw = keyframes`
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
`;

const settle = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
`;

// The optional entrance: strokes draw on, filled pieces settle in after.
const Svg = styled.svg<{ $animated: boolean }>`
  display: block;
  flex: none;

  ${({ $animated, theme }) =>
    $animated &&
    css`
      [data-piece="stroke"] {
        stroke-dasharray: 1;
        animation: ${draw} 900ms ${theme.motion.ease} both;
      }
      [data-piece="fill"] {
        transform-box: fill-box;
        transform-origin: center;
        animation: ${settle} 500ms ${theme.motion.ease} 450ms both;
      }
      ${theme.media.reducedMotion} {
        [data-piece] {
          animation: none;
        }
      }
    `}
`;

// Below this size a concept's sturdier drawing is used.
export const SMALL_BELOW = 20;

export const artFor = (concept: Concept, size: number): MarkArt =>
  size <= SMALL_BELOW ? concept.small : concept.mark;

export default function Mark({
  concept,
  size,
  paint,
  animated = false,
  label,
  className,
  style,
}: {
  concept: Concept;
  size: number;
  paint: Paint;
  animated?: boolean;
  // Names the mark for assistive technology. Without it the mark is decorative.
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const art = artFor(concept, size);
  const gradient = paint.type === "gradient";
  // A mark with its own colours keeps them whenever it is shown in colour.
  const own = gradient ? art.own : undefined;
  // A gradient is referenced by id; a flat colour goes through `style`
  // because a CSS variable cannot be read from a presentation attribute.
  const inkOf = (index: number) => (own ? `url(#${id}-${index})` : gradient ? `url(#${id})` : undefined);
  const flat = gradient ? undefined : paint.color;

  return (
    <Svg
      $animated={animated}
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {own && (
        <defs>
          {own.map(({ from, to, ...line }, index) => (
            <linearGradient key={index} id={`${id}-${index}`} gradientUnits="userSpaceOnUse" {...line}>
              <stop stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
          ))}
        </defs>
      )}
      {gradient && !own && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" {...art.gradient}>
            <stop style={{ stopColor: paint.stops[0] }} />
            <stop offset="0.5" style={{ stopColor: paint.stops[1] }} />
            <stop offset="1" style={{ stopColor: paint.stops[2] }} />
          </linearGradient>
        </defs>
      )}
      {art.shapes.map((shape, index) =>
        shape.kind === "stroke" ? (
          <path
            key={index}
            data-piece="stroke"
            d={shape.d}
            pathLength={1}
            stroke={inkOf(index)}
            strokeWidth={shape.width}
            strokeLinecap={shape.cap ?? "butt"}
            strokeLinejoin={shape.join ?? "round"}
            style={flat ? { stroke: flat } : undefined}
          />
        ) : (
          <path key={index} data-piece="fill" d={shape.d} fill={inkOf(index)} style={flat ? { fill: flat } : undefined} />
        ),
      )}
    </Svg>
  );
}
