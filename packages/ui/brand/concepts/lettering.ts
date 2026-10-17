import { circle, ellipse, polygon, pt, round } from "./geometry";
import type { Shape } from "./types";

// The drawn wordmark: "oxumi" in lowercase, built from one circle and one
// stroke weight. Everything is measured from a round letter whose centre-line
// radius is 10, with the middle of the x-height at y = 0.

const R = 10;
// Flat-ended letters stop this far short of the round ones, which overshoot.
const OVERSHOOT = 0.3;

export interface LetteringOptions {
  weight: number;
  x: "cross" | "arcs";
  joined: boolean;
  cut?: "wide";
}

// The letter proportions of each cut.
//   rx       horizontal radius of the o (its vertical radius is always 10)
//   xHalf    half the x's width, to the centre-lines of its arms
//   ru, rm   radius of the u's bowl and of each arch of the m
//   space    clear space between letters, by the edges that face each other
//   dotR     radius of the i's dot, as a multiple of the stroke weight
//   dotLift  how far the dot's centre sits above the top of the letters
const CUTS = {
  geo: { rx: 10, xHalf: 7.2, ru: 7.6, rm: 6.9, space: { roundDiagonal: 2.7, diagonalStem: 3.3, stemStem: 5.1 }, dotR: 0.62, dotLift: 1.24 },
  // Measured from the owner's brand board.
  wide: { rx: 11.1, xHalf: 10.4, ru: 9.5, rm: 8.65, space: { roundDiagonal: 1.5, diagonalStem: 5, stemStem: 5.4 }, dotR: 0.68, dotLift: 1.45 },
} as const;

export interface Lettering {
  shapes: Shape[];
  // The dot of the i, kept apart so it can take an accent colour.
  dot: Shape;
  width: number;
  // The x-height (outer edge to outer edge of the o).
  xHeight: number;
  // Space above the x-height taken by the dot, mirrored below it so the box
  // is centred on the letters.
  pad: number;
}

export function lettering({ weight: w, x, joined, cut }: LetteringOptions): Lettering {
  const { rx, xHalf, ru, rm, space, dotR: dotRatio, dotLift } = CUTS[cut ?? "geo"];
  const top = -R - w / 2 + OVERSHOOT;
  const bottom = R + w / 2 - OVERSHOOT;
  const shapes: Shape[] = [];
  const stroke = (d: string, width = w): void => {
    shapes.push({ kind: "stroke", d, width });
  };
  let pen = 0;

  // o
  stroke(ellipse(pen + w / 2 + rx, 0, rx, R));
  pen += 2 * rx + w + space.roundDiagonal;

  // x
  if (x === "cross") {
    // Diagonals look heavier than uprights at the same weight.
    const wx = w * 0.93;
    const half = xHalf;
    const slant = Math.atan2(bottom - top, 2 * half);
    const hw = wx / Math.sin(slant);
    const cx = pen + half + hw / 2;
    shapes.push({
      kind: "fill",
      d:
        polygon([
          [cx - half - hw / 2, bottom],
          [cx - half + hw / 2, bottom],
          [cx + half + hw / 2, top],
          [cx + half - hw / 2, top],
        ]) +
        polygon([
          [cx - half - hw / 2, top],
          [cx - half + hw / 2, top],
          [cx + half + hw / 2, bottom],
          [cx + half - hw / 2, bottom],
        ]),
    });
    pen += 2 * half + hw + space.diagonalStem;
  } else {
    // Two arcs back to back, touching in the middle.
    const rho = 11.6;
    const span = Math.asin((R + w / 2 - OVERSHOOT) / (rho + w / 2));
    const half = rho - (rho - w / 2) * Math.cos(span);
    const cx = pen + half;
    const dx = rho * Math.cos(span);
    const dy = rho * Math.sin(span);
    const seat = 0.35;
    stroke(
      `M${pt(cx - seat - rho + dx, -dy)}A${round(rho)} ${round(rho)} 0 0 1 ${pt(cx - seat - rho + dx, dy)}`,
    );
    stroke(
      `M${pt(cx + seat + rho - dx, -dy)}A${round(rho)} ${round(rho)} 0 0 0 ${pt(cx + seat + rho - dx, dy)}`,
    );
    pen += 2 * half + space.diagonalStem;
  }

  // u and m
  const uLeft = pen + w / 2;
  const uRight = uLeft + 2 * ru;
  const bowl = `M${pt(uLeft, top)}V${round(R - ru)}A${ru} ${ru} 0 0 0 ${pt(uRight, R - ru)}`;
  const arch = (from: number) =>
    `A${rm} ${rm} 0 0 1 ${pt(from + 2 * rm, -R + rm)}V${round(bottom)}`;
  let mLeft: number;
  if (joined) {
    mLeft = uRight;
    stroke(`${bowl}V${round(-R + rm)}${arch(mLeft)}`);
  } else {
    stroke(`${bowl}V${round(top)}`);
    mLeft = uRight + w + space.stemStem;
    stroke(`M${pt(mLeft, bottom)}V${round(-R + rm)}${arch(mLeft)}`);
  }
  stroke(`M${pt(mLeft + 2 * rm, -R + rm)}${arch(mLeft + 2 * rm)}`);
  pen = mLeft + 4 * rm + w / 2 + space.stemStem;

  // i
  const stem = pen + w / 2;
  stroke(`M${pt(stem, top)}V${round(bottom)}`);
  const dotR = w * dotRatio;
  const dotY = -R - w / 2 - w * dotLift;
  const dotGap = w * dotLift - dotR;
  pen += w;

  return {
    shapes,
    dot: { kind: "fill", d: circle(stem, dotY, dotR) },
    width: pen,
    xHeight: 2 * R + w,
    pad: dotGap + 2 * dotR + 0.4,
  };
}
