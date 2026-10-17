// Design tokens: the single registry for colour, type, shape, elevation and
// motion. Ant Design's theme, the styled-components theme and the global CSS
// variables are all derived from this file, so a value changed here changes
// everywhere. Components never hard-code a colour, font size or radius.

import {
  type Brand,
  brandPalettes,
  darkPalette,
  DEFAULT_BRAND,
  type Palette,
  type Shadows,
  shadowsFor,
  type ThemeMode,
} from "./palettes";

// ---- Colour ---------------------------------------------------------------
// The concrete colours live in ./palettes: one palette per brand theme and
// mode, all with the same keys. Components do not read them. They read
// `color` below, whose values are CSS custom properties that GlobalStyle
// defines for each theme and mode, so one stylesheet serves all of them.
// Reach for a palette directly only where a real colour value is needed
// (Ant Design's theme, or code that has to compute with a colour).

export { BRANDS, brandPalettes, darkPalette, DEFAULT_BRAND, lightPalette } from "./palettes";
export type { Brand, Palette, Shadows, ThemeMode } from "./palettes";
// The logo keeps its own colours in every theme.
export { logoColor } from "./logo";

export const paletteFor = (mode: ThemeMode, brand: Brand = DEFAULT_BRAND): Palette =>
  brandPalettes[brand][mode];

export const shadowFor = (mode: ThemeMode, brand: Brand = DEFAULT_BRAND): Shadows =>
  shadowsFor(paletteFor(mode, brand), mode);

const VAR_PREFIX = "--cf";
const kebab = (key: string) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

interface Tree {
  readonly [key: string]: string | Tree;
}
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

// { fgMuted: … } becomes { fgMuted: "var(--cf-fg-muted)" }, at any depth.
function references<T extends object>(tree: T, prefix: string): Widen<T> {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => {
      const name = `${prefix}-${kebab(key)}`;
      return [key, typeof value === "string" ? `var(${name})` : references(value as Tree, name)];
    }),
  ) as Widen<T>;
}

function declarations(tree: object, prefix: string): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const name = `${prefix}-${kebab(key)}`;
    return typeof value === "string" ? [`${name}: ${value};`] : declarations(value as Tree, name);
  });
}

// The custom-property declarations for one theme and mode, for GlobalStyle.
export const paletteVars = (mode: ThemeMode, brand: Brand = DEFAULT_BRAND): string =>
  [
    ...declarations(paletteFor(mode, brand), VAR_PREFIX),
    ...declarations(shadowFor(mode, brand), `${VAR_PREFIX}-shadow`),
  ].join("\n");

// What components use. Each value is a `var(--cf-…)` reference, so it works
// anywhere CSS is read (styled-components, a `style` prop, `color-mix()`) and
// follows the mode without a re-render. It is not a colour value: it cannot
// be parsed, concatenated with an alpha suffix, or put in an SVG attribute.
export const color: Palette = references(darkPalette, VAR_PREFIX);

// Signature brand gradient (saffron to pink to violet).
export const gradient = {
  brand: `linear-gradient(100deg, ${color.accent}, ${color.pink} 50%, ${color.violet})`,
} as const;

export const font = {
  sans: "var(--font-geist-sans), system-ui, sans-serif",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
  display: "var(--font-instrument-serif), Georgia, serif",
  // Geist has no Devanagari; Hindi falls through to this face.
  hindi: "var(--font-noto-devanagari), var(--font-geist-sans), sans-serif",
} as const;

export interface TextStyle {
  family: string;
  size: string;
  line: string;
  weight: number;
  tracking: string;
  transform?: "uppercase";
}

// The type scale. Use via the `type()` helper in ./typography.
export const text = {
  hero: { family: font.display, size: "clamp(3.25rem, 9vw, 7rem)", line: "0.95", weight: 400, tracking: "-0.02em" },
  display: { family: font.display, size: "clamp(2.5rem, 6vw, 4.25rem)", line: "1", weight: 400, tracking: "-0.01em" },
  title: { family: font.sans, size: "1.5rem", line: "2rem", weight: 600, tracking: "-0.01em" },
  heading: { family: font.sans, size: "1.0625rem", line: "1.5rem", weight: 600, tracking: "0" },
  lede: { family: font.sans, size: "1.125rem", line: "1.75rem", weight: 400, tracking: "0" },
  body: { family: font.sans, size: "0.875rem", line: "1.375rem", weight: 400, tracking: "0" },
  label: { family: font.sans, size: "0.8125rem", line: "1.125rem", weight: 500, tracking: "0" },
  caption: { family: font.sans, size: "0.75rem", line: "1rem", weight: 400, tracking: "0" },
  overline: { family: font.sans, size: "0.6875rem", line: "1rem", weight: 600, tracking: "0.14em", transform: "uppercase" },
  code: { family: font.mono, size: "0.8125rem", line: "1.25rem", weight: 400, tracking: "0" },
} as const satisfies Record<string, TextStyle>;

// Kept small on purpose: the app is a working tool and should feel crisp,
// like the flow builder. Only marketing surfaces use `panel`.
export const radius = {
  small: "4px",
  control: "6px",
  card: "8px",
  // The site nav's floating capsule and the surfaces that hang from it.
  island: "14px",
  panel: "20px",
  pill: "999px",
} as const;

export const shadow: Shadows = references(shadowsFor(darkPalette, "dark"), `${VAR_PREFIX}-shadow`);

// 4px grid: space(4) === "16px".
export const space = (steps: number): string => `${steps * 4}px`;

export const motion = {
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  fast: "150ms",
  base: "300ms",
  slow: "900ms",
} as const;

export const breakpoint = { sm: 640, md: 900, lg: 1200 } as const;

// Mobile-first media query: ${media.md} { ... }
export const media = {
  sm: `@media (min-width: ${breakpoint.sm}px)`,
  md: `@media (min-width: ${breakpoint.md}px)`,
  lg: `@media (min-width: ${breakpoint.lg}px)`,
  reducedMotion: "@media (prefers-reduced-motion: reduce)",
} as const;

export const layout = {
  // Max width of landing-page content.
  content: "1120px",
  gutter: space(6),
  sidebar: "216px",
  // Collapsed sidebar: icons only.
  rail: "56px",
  topbar: "48px",
} as const;

export const tokens = {
  color,
  gradient,
  font,
  text,
  radius,
  shadow,
  space,
  motion,
  media,
  layout,
} as const;

export type Tokens = typeof tokens;
export type TextToken = keyof typeof text;
