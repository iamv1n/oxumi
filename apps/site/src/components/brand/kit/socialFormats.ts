import { HEADLINE } from "@oxumi/ui/design/logo";
import type { Colorway } from "@oxumi/ui/brand/kit/colorways";
import { glow, Ids, lockupPiece, markPiece, stackedPiece, type Piece, type Rendered } from "@oxumi/ui/brand/kit/compose";

// Ready-made artwork for social profiles and banners, at each platform's
// pixel size. The sizes and safe areas below are from the designer's own
// knowledge of the platforms, not checked against their current
// documentation; each is labelled on the page so it is easy to correct here.

const n = (v: number) => String(Math.round(v * 100) / 100);

export interface SocialFormat {
  id: string;
  label: string;
  where: string;
  w: number;
  h: number;
  // Where the logo and headline may sit: clear of platform crops and of the
  // profile picture that overlaps some banners.
  safe: { x: number; y: number; w: number; h: number };
  safeNote: string;
  logo: "mark" | "lockup" | "stacked";
  // How much of the safe area the logo fills when it is alone, across and down.
  fill: readonly [number, number];
  // Where the headline goes when it is asked for: beside the logo, below
  // it, or nowhere (small formats are logo only).
  headline: "row" | "column" | null;
  // Columns the tile takes on the page, of six.
  span: number;
}

export const SOCIAL_FORMATS: readonly SocialFormat[] = [
  { id: "avatar", label: "Profile avatar", where: "Any platform", w: 400, h: 400, safe: { x: 60, y: 60, w: 280, h: 280 }, safeNote: "Inside the circle platforms crop to", logo: "mark", fill: [0.7, 0.7], headline: null, span: 2 },
  { id: "open-graph", label: "Link preview", where: "Open Graph", w: 1200, h: 630, safe: { x: 100, y: 90, w: 1000, h: 450 }, safeNote: "90px clear of every edge", logo: "lockup", fill: [0.56, 0.4], headline: "column", span: 2 },
  { id: "github", label: "Social preview", where: "GitHub", w: 1280, h: 640, safe: { x: 80, y: 80, w: 1120, h: 480 }, safeNote: "80px clear of every edge", logo: "lockup", fill: [0.5, 0.4], headline: null, span: 2 },
  { id: "x-header", label: "Header", where: "X / Twitter", w: 1500, h: 500, safe: { x: 520, y: 70, w: 900, h: 300 }, safeNote: "Right of the avatar, clear of the top and bottom crop", logo: "lockup", fill: [0.56, 0.42], headline: "row", span: 3 },
  { id: "linkedin-personal", label: "Personal banner", where: "LinkedIn", w: 1584, h: 396, safe: { x: 520, y: 50, w: 984, h: 296 }, safeNote: "Right of the profile photo", logo: "lockup", fill: [0.5, 0.4], headline: "row", span: 3 },
  { id: "linkedin-company", label: "Company banner", where: "LinkedIn", w: 1128, h: 191, safe: { x: 330, y: 24, w: 740, h: 143 }, safeNote: "Right of the company logo", logo: "lockup", fill: [0.5, 0.5], headline: "row", span: 6 },
  { id: "youtube", label: "Channel art", where: "YouTube", w: 2560, h: 1440, safe: { x: 507, y: 508.5, w: 1546, h: 423 }, safeNote: "The centre 1546 by 423 shows on every device", logo: "lockup", fill: [0.5, 0.5], headline: "row", span: 3 },
  { id: "instagram-post", label: "Square post", where: "Instagram", w: 1080, h: 1080, safe: { x: 120, y: 120, w: 840, h: 840 }, safeNote: "120px clear of every edge", logo: "stacked", fill: [0.62, 0.44], headline: "column", span: 2 },
  { id: "instagram-story", label: "Story", where: "Instagram", w: 1080, h: 1920, safe: { x: 110, y: 290, w: 860, h: 1340 }, safeNote: "Clear of the header and reply bar", logo: "stacked", fill: [0.7, 0.34], headline: "column", span: 1 },
] as const;

export const SOCIAL_STYLES = [
  { id: "plain", label: "Plain", note: "The ground and the logo." },
  { id: "glow", label: "Glow", note: "A soft blue light behind the logo, as on the board." },
  { id: "shape", label: "Shape", note: "The two shapes, large and cropped, behind the logo." },
] as const;

export type SocialStyle = (typeof SOCIAL_STYLES)[number]["id"];

// The display serif, by the name the page's embedded font is given.
export const HEADLINE_FAMILY = "Instrument Serif";
// Instrument Serif runs narrow: about this many ems per character.
const ADVANCE = 0.39;
// No banner text is set smaller than this, in the file's own pixels.
export const MIN_TEXT_PX = 24;

interface Placed {
  body: string;
  // The box the logo and headline take together, for the glow.
  box: { x: number; y: number; w: number; h: number };
  textPx?: number;
}

// The hero line as two lines of text: the first upright, the second italic
// in the colourway's accent, as the site's own headline sets it.
function headline(cw: Colorway, x: number, baseline: number, size: number, anchor: "start" | "middle"): string {
  return (
    `<text font-family="'${HEADLINE_FAMILY}', Georgia, serif" font-size="${n(size)}" letter-spacing="${n(-size * 0.012)}" text-anchor="${anchor}" fill="${cw.ink}">` +
    `<tspan x="${n(x)}" y="${n(baseline)}">${HEADLINE[0]}</tspan>` +
    `<tspan x="${n(x)}" y="${n(baseline + size * 1.06)}" font-style="italic" fill="${cw.dot}">${HEADLINE[1]}</tspan></text>`
  );
}

const headlineWidth = (size: number) => Math.max(...HEADLINE.map((line) => line.length)) * ADVANCE * size;

function compose(format: SocialFormat, cw: Colorway, piece: Piece, withHeadline: boolean): Placed {
  const { safe } = format;
  const put = (x: number, y: number, scale: number) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${piece.body}</g>`;
  const cx = safe.x + safe.w / 2;
  const cy = safe.y + safe.h / 2;

  if (withHeadline && format.headline === "row") {
    // Logo left, a hairline, headline right, centred as one group.
    let size = (safe.h * 0.62) / 2.3;
    let logoH = size * 1.42;
    const total = () => piece.w * (logoH / piece.h) + size * 2.2 + headlineWidth(size);
    const fit = Math.min(1, (safe.w * 0.96) / total());
    size *= fit;
    logoH *= fit;
    const scale = logoH / piece.h;
    const x = safe.x + (safe.w - total()) / 2;
    const rule = x + piece.w * scale + size * 1.1;
    return {
      body:
        put(x, cy - logoH / 2, scale) +
        `<path d="M${n(rule)} ${n(cy - size * 1.05)}V${n(cy + size * 1.05)}" stroke="${cw.ink}" stroke-opacity="0.22" stroke-width="${n(Math.max(1, size / 40))}"/>` +
        headline(cw, rule + size * 1.1, cy - size * 0.2, size, "start"),
      box: { x, y: cy - size * 1.2, w: total(), h: size * 2.4 },
      textPx: size,
    };
  }

  if (withHeadline && format.headline === "column") {
    // Logo above, headline below with room between, centred.
    const size = Math.min((safe.w * 0.9) / (headlineWidth(1)), safe.h * 0.17);
    const scale = Math.min((safe.w * format.fill[0]) / piece.w, (safe.h * format.fill[1] * 0.78) / piece.h);
    const gap = size * 1.15;
    const height = piece.h * scale + gap + size * 1.86;
    const top = cy - height / 2;
    return {
      body: put(cx - (piece.w * scale) / 2, top, scale) + headline(cw, cx, top + piece.h * scale + gap + size * 0.76, size, "middle"),
      box: { x: cx - (safe.w * 0.9) / 2, y: top, w: safe.w * 0.9, h: height },
      textPx: size,
    };
  }

  const scale = Math.min((safe.w * format.fill[0]) / piece.w, (safe.h * format.fill[1]) / piece.h);
  const x = cx - (piece.w * scale) / 2;
  const y = cy - (piece.h * scale) / 2;
  return { body: put(x, y, scale), box: { x, y, w: piece.w * scale, h: piece.h * scale } };
}

// One banner. `headline` adds the hero line where the format has room for
// it; `prefix` keeps gradient ids apart when several are inlined in a page.
export function renderSocial(
  format: SocialFormat,
  style: SocialStyle,
  cw: Colorway,
  { headline: wanted = false, prefix }: { headline?: boolean; prefix?: string } = {},
): Rendered {
  const ids = new Ids(prefix);
  const { w, h } = format;
  const piece: Piece = format.logo === "mark" ? markPiece(cw, ids) : format.logo === "stacked" ? stackedPiece(cw, ids) : lockupPiece(cw, ids);
  let placed = compose(format, cw, piece, wanted);
  // Text that would be too small to read is left out rather than shrunk.
  if (placed.textPx !== undefined && placed.textPx < MIN_TEXT_PX) placed = compose(format, cw, piece, false);
  const { box } = placed;

  let defs = piece.defs;
  let ground = `<rect width="${w}" height="${h}" fill="${cw.tile}"/>`;
  if (style === "glow") {
    const reach = Math.max(box.w, box.h);
    const main = glow(ids, cw, box.x + box.w * 0.56, box.y + box.h * 0.6, reach * 0.72, Math.min(reach * 0.72, h * 0.9), 0.42);
    const far = glow(ids, cw, w * 0.96, h * 0.02, w * 0.36, Math.max(h * 0.7, w * 0.2), 0.22);
    defs += main.defs + far.defs;
    ground += far.body + main.body;
  }
  if (style === "shape") {
    const big = markPiece(cw, ids);
    // Large enough to bleed off two edges, set to the right of the logo.
    const bigScale = Math.max(h * 1.5, w * 0.36) / big.h;
    const bx = w - big.w * bigScale * 0.74;
    const by = (h - big.h * bigScale) / 2 + h * 0.08;
    const soft = glow(ids, cw, bx + big.w * bigScale * 0.5, h * 0.5, big.w * bigScale * 0.6, h * 0.9, 0.2);
    defs += big.defs + soft.defs;
    ground += soft.body + `<g opacity="0.16" transform="translate(${n(bx)} ${n(by)}) scale(${n(bigScale)})">${big.body}</g>`;
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><defs>${defs}</defs>${ground}${placed.body}</svg>`,
    width: w,
    height: h,
    textPx: placed.textPx,
  };
}
