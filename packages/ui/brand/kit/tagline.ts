// The tagline drawn as single-line capitals, so an exported SVG needs no
// font. Each glyph is a path in a box 10 units tall; `w` is its width. The
// words themselves come from design/logo.ts.
const GLYPHS: Record<string, { w: number; d: string }> = {
  A: { w: 8.4, d: "M0 10L4.2 0L8.4 10M1.45 6.6H6.95" },
  B: { w: 6.2, d: "M0 0V10M0 0H3.5A2.4 2.4 0 0 1 3.5 4.8H0M3.5 4.8H3.7A2.6 2.6 0 0 1 3.7 10H0" },
  C: { w: 8.3, d: "M8.2 1.2A5 5 0 1 0 8.2 8.8" },
  D: { w: 7.4, d: "M0 0H2.4A5 5 0 0 1 2.4 10H0Z" },
  E: { w: 5.6, d: "M5.6 0H0V10H5.6M0 5H4.9" },
  F: { w: 5.4, d: "M5.4 0H0V10M0 5H4.6" },
  G: { w: 8.8, d: "M8.2 1.2A5 5 0 1 0 8.8 7.6V5.3H5.4" },
  H: { w: 7, d: "M0 0V10M7 0V10M0 5H7" },
  I: { w: 0, d: "M0 0V10" },
  J: { w: 4.6, d: "M4.6 0V7.4A2.4 2.4 0 0 1 0.1 8.6" },
  K: { w: 6.9, d: "M0 0V10M6.6 0L0 6.2M2.4 3.9L6.9 10" },
  L: { w: 5.2, d: "M0 0V10H5.2" },
  M: { w: 9.2, d: "M0 10V0L4.6 8L9.2 0V10" },
  N: { w: 7.2, d: "M0 10V0L7.2 10V0" },
  O: { w: 10, d: "M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5Z" },
  P: { w: 6.2, d: "M0 10V0H3.4A2.8 2.8 0 0 1 3.4 5.6H0" },
  Q: { w: 10, d: "M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5ZM6.4 6.6L10 10.4" },
  R: { w: 6.4, d: "M0 10V0H3.4A2.8 2.8 0 0 1 3.4 5.6H0M3.2 5.6L6.4 10" },
  S: { w: 5.8, d: "M5.5 2.3A2.7 2.5 0 1 0 2.9 5A2.8 2.5 0 1 1 0.2 7.8" },
  T: { w: 7.2, d: "M0 0H7.2M3.6 0V10" },
  U: { w: 7, d: "M0 0V6.5A3.5 3.5 0 0 0 7 6.5V0" },
  V: { w: 8.2, d: "M0 0L4.1 10L8.2 0" },
  W: { w: 11.6, d: "M0 0L2.9 10L5.8 1.4L8.7 10L11.6 0" },
  X: { w: 7.4, d: "M0 0L7.4 10M7.4 0L0 10" },
  Y: { w: 7.8, d: "M0 0L3.9 5.4L7.8 0M3.9 5.4V10" },
  Z: { w: 7, d: "M0 0H7L0 10H7" },
  "'": { w: 0.6, d: "M0.6 0L0 2.8" },
  ".": { w: 0, d: "M0 9.5V10" },
};

// The stroke weight of the capitals, where their height is 10: a medium,
// close to the wordmark's own weight for its size.
export const TAGLINE_STROKE = 1.3;

// A line of capitals as path data, letter-spaced so its ink is exactly
// `width` wide. Returns the paths (in a box 10 tall), the scale to draw them
// at and the stroke weight. Characters with no glyph are left out.
export function taglinePaths(text: string, width: number, capHeight: number): { d: string; scale: number; stroke: number } {
  const scale = capHeight / 10;
  const chars = [...text.toUpperCase()].filter((c) => c === " " || c in GLYPHS);
  const glyphs = chars.filter((c) => c !== " ");
  const natural = glyphs.reduce((sum, c) => sum + GLYPHS[c].w, 0);
  const spaces = chars.length - glyphs.length;
  // One gap between every pair of neighbours; a word gap is 2.4 letter gaps.
  const WORD = 2.4;
  const gaps = chars.length - 1 - 2 * spaces;
  // The strokes overhang the path by half their weight at each end.
  const unit = (width / scale - TAGLINE_STROKE - natural) / (gaps + spaces * WORD);
  let pen = TAGLINE_STROKE / 2;
  let d = "";
  for (const c of chars) {
    if (c === " ") {
      pen += unit * (WORD - 1);
      continue;
    }
    const glyph = GLYPHS[c];
    d += glyph.d.replace(/([MLHVAZ])([^MLHVAZ]*)/g, (_, cmd: string, args: string) => shift(cmd, args, pen));
    pen += glyph.w + unit;
  }
  return { d, scale, stroke: TAGLINE_STROKE };
}

// Moves one absolute path command right by dx.
function shift(cmd: string, args: string, dx: number): string {
  const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  const r = (v: number) => String(Math.round(v * 100) / 100);
  if (cmd === "Z") return "Z";
  if (cmd === "H") return `H${r(nums[0] + dx)}`;
  if (cmd === "V") return `V${r(nums[0])}`;
  if (cmd === "A") return `A${nums.slice(0, 5).join(" ")} ${r(nums[5] + dx)} ${r(nums[6])}`;
  return `${cmd}${r(nums[0] + dx)} ${r(nums[1])}`;
}
