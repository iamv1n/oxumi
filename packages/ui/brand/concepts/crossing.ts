import { circle, polygon, pt, round } from "./geometry";
import type { Concept, MarkArt, Shape } from "./types";

// Crossing: a letter X whose crossing has been cleared by a circular moat and
// replaced with an O. The four arms are cut flat at the top and bottom like a
// letterform, and concentric with the ring where they face it.
//   half    half the letter's width and height, measured to the arm centre-lines
//   w       arm weight
//   ring    centre-line radius and weight of the O
//   moat    clear space between the ring and the arms
export function drawCrossing({
  halfW,
  halfH,
  w,
  ringR,
  ringW,
  moat,
}: {
  halfW: number;
  halfH: number;
  w: number;
  ringR: number;
  ringW: number;
  moat: number;
}): MarkArt {
  const c = 16;
  const len = Math.hypot(halfW, halfH);
  const cut = ringR + ringW / 2 + moat;
  const h = w / 2;
  const along = Math.sqrt(cut * cut - h * h);

  const arm = (sx: 1 | -1, sy: 1 | -1): Shape => {
    const dx = (sx * halfW) / len;
    const dy = (sy * halfH) / len;
    const nx = -dy;
    const ny = dx;
    const edge = (side: 1 | -1, t: number): [number, number] => [
      c + side * h * nx + t * dx,
      c + side * h * ny + t * dy,
    ];
    // Where each edge meets the flat terminal at the top or bottom.
    const end = (side: 1 | -1) => (sy * halfH - side * h * ny) / dy;
    const a0 = edge(1, along);
    const b0 = edge(-1, along);
    const cross = (b0[0] - c) * (a0[1] - c) - (b0[1] - c) * (a0[0] - c);
    return {
      kind: "fill",
      d: `${polygon([a0, edge(1, end(1)), edge(-1, end(-1)), b0]).slice(0, -1)}A${round(cut)} ${round(cut)} 0 0 ${cross > 0 ? 1 : 0} ${pt(a0[0], a0[1])}Z`,
    };
  };

  return {
    shapes: [
      arm(-1, -1),
      arm(1, -1),
      arm(-1, 1),
      arm(1, 1),
      { kind: "stroke", d: circle(c, c, ringR), width: ringW },
    ],
    gradient: { x1: 5, y1: 5, x2: 27, y2: 27 },
  };
}

export const crossing: Concept = {
  id: "crossing",
  name: "Crossing",
  idea: "A monogram: the X's crossing is cleared and given to the O.",
  rationale:
    "Two lines cross, which is a call: two parties, one moment where they meet. The moment itself is the O, the voice orb, held in the negative space where the strokes of the X would have collided. It is the only concept that spells both initials.",
  weaknesses: [
    "A hub with four spokes is a familiar pictogram: it can read as a drone, a valve or a brightness control before it reads as letters.",
    "Five separate pieces; at 16px the moat closes up and it becomes an X with a hole.",
    "Rigid and symmetrical, more industrial than calm.",
  ],
  mark: drawCrossing({ halfW: 11.2, halfH: 13, w: 4.4, ringR: 6, ringW: 4, moat: 2 }),
  small: drawCrossing({ halfW: 11.4, halfH: 13.4, w: 5, ringR: 6, ringW: 4.4, moat: 2 }),
  wordmark: { kind: "text", face: "serif", text: "Oxumi", weight: 400, em: 2.9, tracking: "-0.01em", shift: -0.03 },
  wordmarkWhy:
    "Capitalised in Instrument Serif: the mark is hard and geometric, so the name brings the editorial voice, and the mark has already said O and X.",
  motion: "The ring draws round while the four arms settle in.",
  scores: { distinct: 3, meaning: 4, favicon: 3, balance: 4, lockup: 3, mono: 5, motion: 4 },
};
