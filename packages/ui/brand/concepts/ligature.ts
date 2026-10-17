import { arc, circle } from "./geometry";
import type { Concept, MarkArt } from "./types";

// Ligature: the glyph cut from the custom lettering. An O is two arcs facing
// each other and an X is the same two arcs back to back, so the O's right
// wall is already half of the X: one more arc finishes both letters.
//   r     centre-line radius of the O and of the extra arc
//   w     stroke weight
//   span  half the angle the extra arc covers
//   seat  how far the arc is pulled away from a true tangent. Past the
//         stroke weight the two no longer touch; touching, the pair closes
//         into a Greek alpha.
export function drawLigature({ r, w, span, seat }: { r: number; w: number; span: number; seat: number }): MarkArt {
  // Centre the pair in the box: the ring's left edge and the arc's tips.
  const reach = 2 * r + seat - (r - w / 2) * Math.cos((span * Math.PI) / 180);
  const cx = 16 - (reach - (r + w / 2)) / 2;
  return {
    shapes: [
      { kind: "stroke", d: circle(cx, 16, r), width: w },
      { kind: "stroke", d: arc(cx + 2 * r + seat, 16, r, 180 - span, 180 + span), width: w },
    ],
    gradient: { x1: 4, y1: 8, x2: 28, y2: 24 },
  };
}

export const ligature: Concept = {
  id: "ligature",
  name: "Ligature",
  idea: "Logotype-led: custom lettering where o and x share a stroke and u runs into m as a wave.",
  rationale:
    "The identity lives in the word. An O is two arcs facing each other; an X is the same two arcs turned back to back. Set side by side they share the middle stroke, so three arcs write two letters, and u-m becomes one continuous wave. In code, a pair of parentheses is also how you make a call. The small-size glyph is simply the first three arcs of the word.",
  weaknesses: [
    "The glyph alone reads as 'OC'. Drawn touching, as the letters do in the word, it closes into a Greek alpha, which is worse; so the glyph and the word disagree by a hairline.",
    "Asymmetric: the weight sits left, so it needs optical centring in every tile.",
    "An x made of two arcs is slower to read than a crossed one, and the joined um can be misread as 'w n'.",
    "A logotype-led identity is weakest exactly where this product is seen most: a 16px tab.",
  ],
  mark: drawLigature({ r: 7.8, w: 4, span: 66, seat: 5.4 }),
  small: drawLigature({ r: 7.6, w: 4.6, span: 64, seat: 6.4 }),
  wordmark: { kind: "drawn", weight: 4.2, x: "arcs", joined: true },
  wordmarkWhy:
    "Lowercase and entirely drawn. This concept is the wordmark: its x and its um ligature are the logo.",
  motion: "The ring draws round, then the arc. The richer version swings the two halves of the O round to become the X.",
  scores: { distinct: 3, meaning: 4, favicon: 3, balance: 3, lockup: 5, mono: 5, motion: 4 },
};
