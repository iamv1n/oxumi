import { logoColor } from "../../design/logo";
import { pt, round } from "./geometry";
import type { Concept, MarkArt } from "./types";

// Bolt: the owner's chosen mark, rebuilt from their brand board. Two identical
// forward-slanted parallelograms (45 degrees), the lower one the upper turned
// half round and set down and to the right, so the pair reads as an S or a
// bolt. Each has two sharp corners and two rounded ones: a wide sweep on its
// outer corner, a tighter one on the corner that faces the other shape.
//   h        height of one shape
//   side     length of its top and bottom edges
//   dx, dy   how far the lower shape sits right of and below the upper one
//   outer    radius of the outer sweeps (upper shape's top left, lower's bottom right)
//   inner    radius of the corners facing the gap
export function drawBolt({
  h,
  side,
  dx,
  dy,
  outer,
  inner,
}: {
  h: number;
  side: number;
  dx: number;
  dy: number;
  outer: number;
  inner: number;
}): MarkArt {
  // A circular fillet on a 135 degree corner starts this far from the corner.
  const reach = (r: number) => r * Math.tan(Math.PI / 8);
  const k = Math.SQRT1_2;
  // One shape with its top-left box corner at (x, y): sharp at bottom left
  // and top right, radius `tl` at top left and `br` at bottom right.
  const shape = (x: number, y: number, tl: number, br: number) => {
    const a = reach(tl);
    const b = reach(br);
    return (
      `M${pt(x, y + h)}` +
      `L${pt(x + h - a * k, y + a * k)}A${round(tl)} ${round(tl)} 0 0 1 ${pt(x + h + a, y)}` +
      `L${pt(x + h + side, y)}` +
      `L${pt(x + side + b * k, y + h - b * k)}A${round(br)} ${round(br)} 0 0 1 ${pt(x + side - b, y + h)}Z`
    );
  };
  const width = h + side + dx;
  const height = h + dy;
  const x = (32 - width) / 2;
  const y = (32 - height) / 2;
  return {
    shapes: [
      { kind: "fill", d: shape(x, y, outer, inner) },
      { kind: "fill", d: shape(x + dx, y + dy, inner, outer) },
    ],
    // Used only if the mark is asked for in a theme gradient.
    gradient: { x1: x, y1: y, x2: x + width, y2: y + height },
    own: [
      { x1: x, y1: y + h, x2: x + h + side, y2: y, from: logoColor.upperFrom, to: logoColor.upperTo },
      { x1: x + dx, y1: y + dy + h, x2: x + dx + h + side, y2: y + dy, from: logoColor.lowerFrom, to: logoColor.lowerTo },
    ],
  };
}

// The mark's measurements, on the 32-unit grid.
export const BOLT = { h: 15, side: 10, dx: 4.25, dy: 11.25, outer: 6, inner: 3.6 } as const;

export const bolt: Concept = {
  id: "bolt",
  name: "Bolt",
  idea: "The owner's mark: two slanted blades, one set below and ahead of the other, reading as an S or a bolt.",
  rationale:
    "Chosen by the product owner from their brand board and rebuilt here as geometry: two identical 45-degree parallelograms, the lower one the upper turned half round, with a wide circular sweep on each outer corner and a tighter one on the corners that face the gap. Periwinkle above, saturated blue below, in every theme.",
  weaknesses: [
    "The blue is its own: it does not come from the product's theme, so on a theme of another hue the logo and the interface use different palettes.",
    "The board's soft glow and glassy shading are not reproduced; the mark is flat with a gentle gradient.",
  ],
  mark: drawBolt(BOLT),
  // Nearly the same drawing: the gap is already 2.75px wide at 16px. The
  // shapes are a little slimmer so it opens to 3px, and the sweeps tighter.
  small: drawBolt({ h: 15, side: 9.6, dx: 4.4, dy: 11.4, outer: 5, inner: 3 }),
  wordmark: { kind: "drawn", weight: 5.3, x: "cross", joined: false, cut: "wide", dot: logoColor.dot },
  wordmarkWhy:
    "Lowercase, drawn as paths to match the board: a wide geometric cut with an oval o, and a larger periwinkle dot set high above the i. No new font is loaded.",
  motion: "The two blades settle in, upper then lower.",
  lockup: { xHeight: 0.41, gap: 0.1 },
};
