import { arc } from "./geometry";
import type { Concept, MarkArt } from "./types";

// Tide: an O cut along the horizon and slid apart, so the top half is a wave
// crest and the bottom half a trough. Two butt-ended arcs of one weight.
//   r      centre-line radius of both halves
//   w      stroke weight
//   shift  how far each half slides from the centre (top left, bottom right)
//   gap    the horizon: clear space between the two halves
export function drawTide({ r, w, shift, gap }: { r: number; w: number; shift: number; gap: number }): MarkArt {
  return {
    shapes: [
      { kind: "stroke", d: arc(16 - shift, 16 - gap / 2, r, 180, 360), width: w },
      { kind: "stroke", d: arc(16 + shift, 16 + gap / 2, r, 0, 180), width: w },
    ],
    // Saffron sun above, violet sea below.
    gradient: { x1: 8, y1: 4, x2: 24, y2: 28 },
  };
}

export const tide: Concept = {
  id: "tide",
  name: "Tide",
  idea: "An O cut along the horizon and slid apart: one cycle of a wave that is also the letter.",
  rationale:
    "Sound is a wave and umi is the sea. Slide the two halves of an O apart and they become a crest and a trough, one full cycle, while the eye still closes them into the letter. The cut is the horizon: saffron above, violet below. It is also two parties, a question going out and an answer coming back, and a path that parts and rejoins.",
  weaknesses: [
    "A sliced-and-shifted circle is a known device (Abstract and Segment use relatives of it), so the weight and the exact offset have to carry the ownership.",
    "Says wave and O clearly, says X not at all.",
    "At 16px the horizon is a single pixel; it survives, but only with the heavier small-size drawing.",
    "The wordmark also starts with an o, so the lockup says O twice.",
  ],
  mark: drawTide({ r: 9.5, w: 5.5, shift: 2.75, gap: 1.25 }),
  small: drawTide({ r: 9.25, w: 6, shift: 3, gap: 2 }),
  wordmark: { kind: "drawn", weight: 4.2, x: "cross", joined: false },
  wordmarkWhy:
    "Lowercase, drawn from the same circle and the same butt-ended stroke as the mark, so the two read as one hand.",
  motion: "The crest and the trough draw on together from opposite ends and stop a horizon apart. For a hero it can go further: start as a full sine wave and slide shut.",
  scores: { distinct: 4, meaning: 5, favicon: 5, balance: 5, lockup: 4, mono: 5, motion: 5 },
};
