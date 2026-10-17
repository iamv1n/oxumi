import { bolt } from "../concepts/bolt";
import { lettering } from "../concepts/lettering";
import type { Shape } from "../concepts/types";
import type { Colorway } from "./colorways";
import { TAGLINE } from "../../design/logo";
import { taglinePaths } from "./tagline";

// Builds every brand-kit design as a standalone SVG document: plain paths
// and gradients, real colour values, no fonts, no CSS. The same strings are
// what the /brand page shows, copies and rasterises, and what
// scripts/build-brand-kit.mjs writes to public/brand, so they cannot drift
// from the components (which draw the same geometry).

const n = (v: number) => String(Math.round(v * 1000) / 1000);

// One drawing with its origin at the top left of a w by h box.
export interface Piece {
  w: number;
  h: number;
  defs: string;
  body: string;
}

// Gradient ids, unique within one document.
export class Ids {
  private count = 0;
  constructor(private prefix = "ox") {}
  next() {
    return `${this.prefix}${this.count++}`;
  }
}

const place = (piece: Piece, x: number, y: number, scale = 1, extra = ""): string =>
  `<g transform="translate(${n(x)} ${n(y)})${scale === 1 ? "" : ` scale(${n(scale)})`}"${extra}>${piece.body}</g>`;

function paths(shapes: readonly Shape[], ink: (index: number) => string): string {
  return shapes
    .map((shape, index) =>
      shape.kind === "stroke"
        ? `<path d="${shape.d}" fill="none" stroke="${ink(index)}" stroke-width="${shape.width}" stroke-linejoin="round"/>`
        : `<path d="${shape.d}" fill="${ink(index)}"/>`,
    )
    .join("");
}

// The mark, cropped to its two shapes.
export function markPiece(cw: Colorway, ids: Ids, single?: string): Piece {
  const art = bolt.mark;
  const { x1: x, y1: y, x2, y2 } = art.gradient;
  const stops = [cw.upper, cw.lower];
  let defs = "";
  const inks = (art.own ?? []).map((line, index) => {
    const [from, to] = single ? [single, single] : stops[index];
    if (from === to) return from;
    const id = ids.next();
    defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(line.x1)}" y1="${n(line.y1)}" x2="${n(line.x2)}" y2="${n(line.y2)}"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
    return `url(#${id})`;
  });
  return {
    w: x2 - x,
    h: y2 - y,
    defs,
    body: `<g transform="translate(${n(-x)} ${n(-y)})">${paths(art.shapes, (index) => inks[index])}</g>`,
  };
}

// The wordmark. Its box is the lowercase letters; `rise` is how far the dot
// of the i stands above it.
export function wordPiece(cw: Colorway, single?: string): Piece & { rise: number } {
  const spec = bolt.wordmark;
  if (spec.kind !== "drawn") throw new Error("the kit needs a drawn wordmark");
  const art = lettering({ weight: spec.weight, x: spec.x, joined: spec.joined, cut: spec.cut });
  const ink = single ?? cw.ink;
  return {
    w: art.width,
    h: art.xHeight,
    rise: art.pad - 0.4,
    defs: "",
    body: `<g transform="translate(0 ${n(art.xHeight / 2)})">${paths(art.shapes, () => ink)}<path d="${art.dot.d}" fill="${single ?? cw.dot}"/></g>`,
  };
}

// Proportions, measured from the owner's board, in units of the mark's height.
export const PROPORTION = {
  // Height of the lowercase letters beside the mark, and the space between.
  lockupLetters: 0.5,
  lockupGap: 0.17,
  // The stacked lockup: letters under the mark.
  stackedLetters: 0.4,
  stackedGap: 0.34,
  // The tagline, in units of the letters' height: cap height and drop below.
  taglineCap: 0.3,
  taglineDrop: 0.34,
} as const;

// The tagline under the letters: one line of drawn capitals, exactly as wide
// as the wordmark. `cap` overrides the cap height (for comparing settings).
function taglinePiece(width: number, letters: number, color: string, cap = letters * PROPORTION.taglineCap): Piece {
  const { d, scale, stroke } = taglinePaths(TAGLINE, width, cap);
  return {
    w: width,
    h: cap,
    defs: "",
    body: `<path transform="scale(${n(scale)})" d="${d}" fill="none" stroke="${color}" stroke-opacity="0.86" stroke-width="${stroke}" stroke-linejoin="round"/>`,
  };
}

export function lockupPiece(cw: Colorway, ids: Ids, { tagline = false, single, cap }: { tagline?: boolean; single?: string; cap?: number } = {}): Piece {
  const mark = markPiece(cw, ids, single);
  const word = wordPiece(cw, single);
  const letters = mark.h * PROPORTION.lockupLetters;
  const scale = letters / word.h;
  const wx = mark.w + mark.h * PROPORTION.lockupGap;
  const wy = (mark.h - letters) / 2;
  let body = mark.body + place(word, wx, wy, scale);
  let h = mark.h;
  if (tagline) {
    const line = taglinePiece(word.w * scale, letters, single ?? cw.ink, cap === undefined ? undefined : letters * cap);
    const ty = wy + letters * (1 + PROPORTION.taglineDrop);
    body += place(line, wx, ty);
    h = Math.max(h, ty + line.h);
  }
  return { w: wx + word.w * scale, h, defs: mark.defs, body };
}

export function stackedPiece(cw: Colorway, ids: Ids, { tagline = false }: { tagline?: boolean } = {}): Piece {
  const mark = markPiece(cw, ids);
  const word = wordPiece(cw);
  const letters = mark.h * PROPORTION.stackedLetters;
  const scale = letters / word.h;
  const w = Math.max(mark.w, word.w * scale);
  const wy = mark.h + mark.h * PROPORTION.stackedGap;
  let body = place(mark, (w - mark.w) / 2, 0) + place(word, (w - word.w * scale) / 2, wy, scale);
  let h = wy + letters;
  if (tagline) {
    const line = taglinePiece(word.w * scale, letters, cw.ink);
    const ty = wy + letters * (1 + PROPORTION.taglineDrop);
    body += place(line, (w - line.w) / 2, ty);
    h = ty + line.h;
  }
  return { w, h, defs: mark.defs, body };
}

function wordOnly(cw: Colorway): Piece {
  const word = wordPiece(cw);
  return { w: word.w, h: word.h + word.rise, defs: "", body: place(word, 0, word.rise) };
}

// A soft glow of the colourway's light, for tiles and banners.
export function glow(ids: Ids, cw: Colorway, cx: number, cy: number, rx: number, ry: number, strength = 0.4): { defs: string; body: string } {
  const id = ids.next();
  return {
    defs: `<radialGradient id="${id}"><stop stop-color="${cw.glow}" stop-opacity="${strength}"/><stop offset="1" stop-color="${cw.glow}" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#${id})"/>`,
  };
}

export const DESIGNS = [
  { id: "mark", label: "Mark", use: "Where the name is already nearby: app chrome, favicons, small spaces." },
  { id: "wordmark", label: "Wordmark", use: "Where the mark already appears, or in a line of text-sized logos." },
  { id: "lockup", label: "Horizontal lockup", use: "The default. Headers, documents, partner pages." },
  { id: "stacked", label: "Stacked lockup", use: "Square and tall spaces: posters, title slides, merchandise." },
  { id: "tagline", label: "Lockup with tagline", use: "Large display only: covers, hero panels, the end of a video." },
  { id: "app-icon", label: "App icon", use: "Home screens and app stores. Always on its own tile." },
  { id: "avatar", label: "Avatar", use: "Social profiles. The mark stays inside the circle a platform crops to." },
  { id: "mono", label: "One-colour lockup", use: "Engraving, embossing, single-ink print, fax-grade surfaces." },
] as const;

export type DesignId = (typeof DESIGNS)[number]["id"];

export interface Rendered {
  svg: string;
  // Size of the smallest text in the document, in its own pixels (banners).
  textPx?: number;
  // Aspect of the document, in its own units.
  width: number;
  height: number;
}

export function document({ w, h, defs, body }: Piece, px?: number): Rendered {
  // With no size asked for, the longest side is 512 pixels.
  const scale = px ? px / w : 512 / Math.max(w, h);
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(w * scale)}" height="${n(h * scale)}" viewBox="0 0 ${n(w)} ${n(h)}" fill="none">` +
      (defs ? `<defs>${defs}</defs>` : "") +
      `${body}</svg>`,
    width: w,
    height: h,
  };
}

// Clear space around each design, in units of the mark's height.
export const CLEAR_SPACE: Record<DesignId, number> = {
  mark: 0.5,
  wordmark: 0.5,
  lockup: 0.5,
  stacked: 0.5,
  tagline: 0.5,
  "app-icon": 0,
  avatar: 0,
  mono: 0.5,
};

// One design in one colourway.
//   px      pixel width of the document (default: longest side 512)
//   bleed   app icon only: a full square with no rounded corners, for
//           platforms that round it themselves
//   square  centre the design in a square (favicons)
export function renderDesign(
  design: DesignId,
  cw: Colorway,
  { px, bleed = false, square = false }: { px?: number; bleed?: boolean; square?: boolean } = {},
): Rendered {
  const ids = new Ids();
  if (design === "app-icon" || design === "avatar") {
    const size = 100;
    const mark = markPiece(cw, ids);
    const scale = (size * (design === "avatar" ? 0.48 : 0.56)) / mark.w;
    const light = glow(ids, cw, size * 0.58, size * 0.6, size * 0.5, size * 0.5, 0.36);
    const ground =
      design === "avatar"
        ? `<circle cx="50" cy="50" r="50" fill="${cw.tile}"/>`
        : `<rect width="100" height="100" rx="${bleed ? 0 : 22.5}" fill="${cw.tile}"/>`;
    const clipId = ids.next();
    const clip =
      design === "avatar"
        ? `<clipPath id="${clipId}"><circle cx="50" cy="50" r="50"/></clipPath>`
        : `<clipPath id="${clipId}"><rect width="100" height="100" rx="${bleed ? 0 : 22.5}"/></clipPath>`;
    return document(
      {
        w: size,
        h: size,
        defs: mark.defs + light.defs + clip,
        body: `${ground}<g clip-path="url(#${clipId})">${light.body}</g>${place(mark, (size - mark.w * scale) / 2, (size - mark.h * scale) / 2, scale)}`,
      },
      px,
    );
  }
  const piece =
    design === "mark"
      ? markPiece(cw, ids)
      : design === "wordmark"
        ? wordOnly(cw)
        : design === "stacked"
          ? stackedPiece(cw, ids)
          : design === "mono"
            ? lockupPiece(cw, ids, { single: cw.mono })
            : lockupPiece(cw, ids, { tagline: design === "tagline" });
  // On a ground, the clear space is part of the file; transparent files are
  // cropped close, with a hair of margin so edges are not clipped.
  const pad = cw.bg ? markPiece(cw, new Ids()).h * CLEAR_SPACE[design] : 0.5;
  const side = Math.max(piece.w, piece.h);
  const w = (square ? side : piece.w) + 2 * pad;
  const h = (square ? side : piece.h) + 2 * pad;
  return document(
    {
      w,
      h,
      defs: piece.defs,
      body: (cw.bg ? `<rect width="${n(w)}" height="${n(h)}" fill="${cw.bg}"/>` : "") + place(piece, (w - piece.w) / 2, (h - piece.h) / 2),
    },
    px,
  );
}
