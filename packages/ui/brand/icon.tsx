import { ImageResponse } from "next/og";
import { activeConcept } from "./active";
import type { Concept } from "./concepts";
import { logoColor } from "../design/logo";

// The favicon and app icons, drawn from the live concept. An image has no
// theme, so the colours are fixed. A mark with colours of its own uses them;
// an exploration without any gets these stops, chosen to hold on both a light
// and a dark browser tab.
export const ICON_STOPS = ["#ffa62e", "#ea4c9c", "#7b63f6"] as const;

// The mark as a standalone SVG document.
//   tile: put it on the dark navy tile with a soft glow (app icons), else
//         leave it bare on a transparent ground.
export function iconSvg(size: number, { tile = false, concept = activeConcept }: { tile?: boolean; concept?: Concept } = {}) {
  // The bare mark fills the box; on a tile it keeps a margin.
  const inner = tile ? 0.66 : 1;
  const art = size * inner <= 20 ? concept.small : concept.mark;
  const scale = inner;
  const offset = (32 * (1 - inner)) / 2;
  const { x1, y1, x2, y2 } = art.gradient;
  const ink = (index: number) => `url(#g${art.own ? index : ""})`;
  const shapes = art.shapes
    .map((shape, index) =>
      shape.kind === "stroke"
        ? `<path d="${shape.d}" fill="none" stroke="${ink(index)}" stroke-width="${shape.width}" stroke-linecap="${shape.cap ?? "butt"}" stroke-linejoin="${shape.join ?? "round"}"/>`
        : `<path d="${shape.d}" fill="${ink(index)}"/>`,
    )
    .join("");
  const gradients = art.own
    ? art.own
        .map(
          (g, index) =>
            `<linearGradient id="g${index}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"><stop stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient>`,
        )
        .join("")
    : `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      `<stop stop-color="${ICON_STOPS[0]}"/><stop offset=".5" stop-color="${ICON_STOPS[1]}"/><stop offset="1" stop-color="${ICON_STOPS[2]}"/>` +
      `</linearGradient>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">` +
    `<defs>${gradients}` +
    `<radialGradient id="glow" cx="0.58" cy="0.6" r="0.5"><stop stop-color="${logoColor.glow}" stop-opacity="0.34"/><stop offset="1" stop-color="${logoColor.glow}" stop-opacity="0"/></radialGradient></defs>` +
    (tile ? `<rect width="32" height="32" fill="${logoColor.tile}"/><rect width="32" height="32" fill="url(#glow)"/>` : "") +
    `<g transform="translate(${offset} ${offset}) scale(${scale})">${shapes}</g></svg>`
  );
}

// A PNG of the icon, for `app/icon.tsx` and `app/apple-icon.tsx` to return.
export function iconResponse(size: number, options: { tile?: boolean; concept?: Concept } = {}) {
  const src = `data:image/svg+xml;base64,${Buffer.from(iconSvg(size, options)).toString("base64")}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img src={src} width={size} height={size} />
    ),
    { width: size, height: size },
  );
}
