import { circle } from "./geometry";
import type { Concept, MarkArt } from "./types";

// Capture: a ring held in a square corner. Round is the voice, square is the
// structure it lands in; together they are the outline of a speech bubble.
//   r, w     centre-line radius and weight of the ring
//   bw       weight of the corner
//   clear    space between the ring and the corner where they run closest
//   arm      how far each arm of the corner runs back past the ring's centre
export function drawCapture({
  r,
  w,
  bw,
  clear,
  arm,
}: {
  r: number;
  w: number;
  bw: number;
  clear: number;
  arm: number;
}): MarkArt {
  // Lay out from the top-left margin, then centre the whole figure.
  const extent = 2 * (r + w / 2) + clear + bw;
  const origin = (32 - extent) / 2;
  const c = origin + r + w / 2;
  const edge = c + r + w / 2 + clear + bw / 2;
  return {
    shapes: [
      { kind: "stroke", d: circle(c, c, r), width: w },
      { kind: "stroke", d: `M${edge} ${c - arm}V${edge}H${c - arm}`, width: bw, join: "miter" },
    ],
    gradient: { x1: 5, y1: 5, x2: 28, y2: 28 },
  };
}

export const capture: Concept = {
  id: "capture",
  name: "Capture",
  idea: "A round voice held in a square corner: speech, caught as structure.",
  rationale:
    "The product turns something round into something square: a person's spoken answer into a typed, validated field. The ring is the voice (and the O); the right angle is the schema that catches it. Together they draw a speech bubble, the round kind with one sharp corner, without drawing one. The corner is also half of a bracket, which is where a developer expects an answer to arrive.",
  weaknesses: [
    "A circle in a corner is close to a chat-bubble glyph, and chat is a crowded place for a logo to stand.",
    "Reads as a lowercase a or a Q at a glance, which is the wrong letter.",
    "Two unrelated shapes side by side rather than one form; the weight sits upper left.",
    "Static by nature: it shows a before and an after, not a movement.",
  ],
  mark: drawCapture({ r: 7.8, w: 5, bw: 4.6, clear: 1.9, arm: 0 }),
  small: drawCapture({ r: 7.4, w: 5.4, bw: 5, clear: 2, arm: 0 }),
  wordmark: { kind: "drawn", weight: 4.6, x: "cross", joined: false },
  wordmarkWhy:
    "Lowercase and drawn, a little heavier than the others to stand up to the solid corner.",
  motion: "The ring draws round as the corner draws in beside it.",
  scores: { distinct: 3, meaning: 5, favicon: 4, balance: 3, lockup: 3, mono: 5, motion: 3 },
};
