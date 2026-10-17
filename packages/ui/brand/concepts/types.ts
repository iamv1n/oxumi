// The shared shape of a logo concept. A mark is plain data (paths on a
// 32-unit grid), so the same drawing renders as React, as a standalone SVG
// string (favicon, app icon) and in the comparison page without a second copy.

export type Shape =
  | {
      kind: "stroke";
      d: string;
      width: number;
      cap?: "butt" | "round";
      join?: "miter" | "round";
    }
  | { kind: "fill"; d: string };

// One drawing of a mark, in a 0 0 32 32 box.
export interface MarkArt {
  shapes: readonly Shape[];
  // Where the brand gradient runs, in the same units: saffron at (x1, y1),
  // violet at (x2, y2).
  gradient: { x1: number; y1: number; x2: number; y2: number };
  // A mark that carries its own colours: one two-stop gradient per shape,
  // used instead of the theme's whenever the mark is shown in colour.
  own?: readonly OwnPaint[];
}

export interface OwnPaint {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  from: string;
  to: string;
}

// How the name is set beside the mark.
export type WordmarkSpec =
  | {
      kind: "drawn";
      // Stroke weight, in units where the round letters have a radius of 10.
      weight: number;
      // "cross": two straight diagonals. "arcs": two arcs back to back.
      x: "cross" | "arcs";
      // Run the u into the m as one wave.
      joined: boolean;
      // "wide": an extended cut with an oval o and a high, larger dot.
      cut?: "wide";
      // A fixed colour for the dot of the i.
      dot?: string;
    }
  | {
      kind: "text";
      face: "sans" | "serif";
      text: "oxumi" | "Oxumi";
      weight: number;
      // Font size as a multiple of the lockup's x-height.
      em: number;
      tracking: string;
      // Vertical nudge (in em) that centres the letters on the mark.
      shift: number;
    };

export type ConceptId = "bolt" | "tide" | "crossing" | "circuit" | "capture" | "ligature";

export interface Concept {
  id: ConceptId;
  name: string;
  // One line: what the mark is.
  idea: string;
  rationale: string;
  weaknesses: readonly string[];
  mark: MarkArt;
  // A sturdier drawing for 20px and below.
  small: MarkArt;
  wordmark: WordmarkSpec;
  wordmarkWhy: string;
  motion: string;
  // 1 to 5 against each criterion on the comparison page.
  scores?: Readonly<Record<Criterion, number>>;
  // Lockup proportions, as fractions of the mark's box: the height of the
  // lowercase letters, and the space between mark and letters.
  lockup?: { xHeight: number; gap: number };
}

export const CRITERIA = [
  ["distinct", "Distinctive"],
  ["meaning", "Meaning"],
  ["favicon", "16px"],
  ["balance", "Balance"],
  ["lockup", "With wordmark"],
  ["mono", "One colour"],
  ["motion", "Animates"],
] as const;

export type Criterion = (typeof CRITERIA)[number][0];
