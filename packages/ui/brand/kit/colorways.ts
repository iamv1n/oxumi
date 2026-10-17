import { logoColor } from "../../design/logo";
import { BRAND_LABELS, brandPalettes, DEFAULT_BRAND, type Brand } from "../../design/palettes";

// A colourway: every colour one rendering of the logo needs. The brand kit
// draws each design in whichever colourway is selected, and exports exactly
// that.
export interface Colorway {
  id: string;
  label: string;
  note: string;
  // Not the brand's own colours: borrowed from one of the product's themes.
  alternate: boolean;
  // Ground behind a logo. null is transparent.
  bg: string | null;
  // Ground for designs that always carry one (app icon, avatar, banners).
  tile: string;
  // The two shapes of the mark, each a two-stop gradient.
  upper: readonly [string, string];
  lower: readonly [string, string];
  // Letters, the dot of the i, the glow on tiles, and the single ink of the
  // one-colour lockup.
  ink: string;
  dot: string;
  glow: string;
  mono: string;
  // What a transparent rendering is previewed on.
  backdrop: "dark" | "light";
}

// The brand's fixed colours, as on the owner's board.
export const brandColor = {
  navy: logoColor.tile,
  ink: "#0a1024",
  white: "#ffffff",
  black: "#000000",
  blue: logoColor.lowerFrom,
} as const;

const blues = {
  upper: [logoColor.upperFrom, logoColor.upperTo],
  lower: [logoColor.lowerFrom, logoColor.lowerTo],
  dot: logoColor.dot,
  glow: logoColor.glow,
} as const;

const flat = (color: string) => ({ upper: [color, color], lower: [color, color], ink: color, dot: color, mono: color }) as const;

const fromTheme = (brand: Brand): Colorway => {
  const label = BRAND_LABELS[brand].name;
  const note = brand === DEFAULT_BRAND ? "Alternate: the product's default theme" : "Alternate: a product theme";
  const p = brandPalettes[brand].dark;
  return {
    id: brand,
    label,
    note,
    alternate: true,
    bg: p.canvas,
    tile: p.canvas,
    upper: [p.accent, p.accentHover],
    lower: [p.pink, p.violet],
    ink: p.fg,
    dot: p.accent,
    glow: p.violet,
    mono: p.fg,
    backdrop: "dark",
  };
};

export const PRIMARY_COLORWAY = "blue-navy";

export const colorways: readonly Colorway[] = [
  { id: PRIMARY_COLORWAY, label: "Blue on navy", note: "Primary", alternate: false, bg: brandColor.navy, tile: brandColor.navy, ...blues, ink: brandColor.white, mono: brandColor.white, backdrop: "dark" },
  { id: "blue-white", label: "Blue on white", note: "Light grounds", alternate: false, bg: brandColor.white, tile: brandColor.white, ...blues, ink: brandColor.ink, mono: brandColor.ink, backdrop: "light" },
  { id: "clear-dark", label: "Transparent, light letters", note: "Over dark photos and UI", alternate: false, bg: null, tile: brandColor.navy, ...blues, ink: brandColor.white, mono: brandColor.white, backdrop: "dark" },
  { id: "clear-light", label: "Transparent, dark letters", note: "Over light photos and UI", alternate: false, bg: null, tile: brandColor.white, ...blues, ink: brandColor.ink, mono: brandColor.ink, backdrop: "light" },
  { id: "solid-blue", label: "Solid blue", note: "One ink, in colour", alternate: false, bg: null, tile: brandColor.white, ...flat(brandColor.blue), glow: logoColor.glow, backdrop: "light" },
  { id: "white", label: "All white", note: "One colour, on dark", alternate: false, bg: null, tile: brandColor.navy, ...flat(brandColor.white), glow: logoColor.glow, backdrop: "dark" },
  { id: "black", label: "All black", note: "One colour, print and engraving", alternate: false, bg: null, tile: brandColor.white, ...flat(brandColor.black), glow: "#8a94b8", backdrop: "light" },
  fromTheme("aurora"),
  fromTheme("mint"),
  fromTheme("coral"),
  fromTheme("glacier"),
];

export const colorwayById = (id: string): Colorway => colorways.find((c) => c.id === id) ?? colorways[0];
