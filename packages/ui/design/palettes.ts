// Every colour in the product, as concrete values: one palette per brand
// theme and mode. Nothing here is read by components directly. tokens.ts
// turns a palette into CSS variables, and components use those.
//
// "Aurora" is the original look and the default. The others are experiments
// offered through the Theme Lab (theme/ThemeLab.tsx). The first
// five keep the idea the product was designed around (a deep, cool-leaning
// base, two secondary brand colours, one warm yellow-to-amber accent) and
// move it somewhere else; the last four leave yellow behind altogether, one
// each for blue, green, red and periwinkle. Run `node scripts/check-palettes.mjs` after changing any of them: it
// computes every contrast ratio the design relies on.

// Which palette is showing. "system" is a preference, never a mode.
export type ThemeMode = "light" | "dark";

export const BRANDS = [
  "aurora",
  "voltage",
  "marigold",
  "jewel",
  "mono",
  "neon",
  "cobalt",
  "mint",
  "coral",
  "glacier",
] as const;
export type Brand = (typeof BRANDS)[number];
export const DEFAULT_BRAND: Brand = "glacier";

export const BRAND_LABELS: Record<Brand, { name: string; note: string }> = {
  aurora: { name: "Aurora", note: "The original: saffron, pink and violet" },
  voltage: { name: "Voltage", note: "Cooler and electric: indigo, cyan, lemon" },
  marigold: { name: "Marigold", note: "Warm and earthy: ink, marigold, terracotta" },
  jewel: { name: "Jewel", note: "Emerald and teal with gold" },
  mono: { name: "Mono", note: "Greys with one vivid amber" },
  neon: { name: "Neon Dusk", note: "Bolder: magenta and violet on deep purple" },
  cobalt: { name: "Cobalt", note: "Azure blue on blue-black" },
  mint: { name: "Mint", note: "Mint green with silver-greys" },
  coral: { name: "Coral", note: "Coral red on warm charcoal" },
  glacier: { name: "Glacier", note: "Periwinkle and ice on cool slate" },
};

// ---- Aurora: the original, kept exactly ------------------------------------

export const darkPalette = {
  // Surfaces, back to front
  canvas: "#07070a",
  surface: "#0e0e13",
  raised: "#15151c",
  overlay: "#1c1c25",
  // Things that float above the page and cast a shadow: flow nodes, menus,
  // dialogs. Lighter than what is under it in the dark, plain white in the light.
  elevated: "#15151c",
  hover: "rgba(255, 255, 255, 0.05)",

  // Lines
  line: "rgba(255, 255, 255, 0.08)",
  lineStrong: "rgba(255, 255, 255, 0.16)",

  // Text
  fg: "#f4f4f5",
  fgMuted: "#a1a1aa",
  fgSubtle: "#71717a",
  fgFaint: "#4b4b55",

  // Brand. `accent` is a fill and carries `accentFg` text. A bright accent is
  // too pale to read on white, so accent-coloured text and icons use
  // `accentText` and borders, rings and strokes use `accentLine`; in the dark
  // all three are the same colour.
  accent: "#ffb347",
  accentHover: "#ffc470",
  accentFg: "#1c1203",
  accentSoft: "rgba(255, 179, 71, 0.14)",
  accentText: "#ffb347",
  accentTextHover: "#ffc470",
  accentLine: "#ffb347",
  // The two secondary brand colours, named for what they are in Aurora. In
  // other themes they hold that theme's secondaries (cyan and indigo, say).
  pink: "#f472b6",
  violet: "#8b7bff",

  // Status
  success: "#4ade80",
  successSoft: "rgba(74, 222, 128, 0.14)",
  warning: "#fbbf24",
  warningSoft: "rgba(251, 191, 36, 0.14)",
  danger: "#f87171",
  dangerSoft: "rgba(248, 113, 113, 0.14)",
  info: "#60a5fa",
  infoSoft: "rgba(96, 165, 250, 0.14)",

  // Flow node kinds
  node: {
    start: "#4ade80",
    say: "#60a5fa",
    ask: "#ffb347",
    branch: "#8b7bff",
    end: "#f472b6",
    transfer: "#2dd4bf",
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Palette = Widen<typeof darkPalette>;

// Designed for a near-white page, not inverted from the dark one. Every text
// and status colour is at least 4.5:1 on canvas, surface and raised;
// `fgFaint` and `accentLine` are at least 3:1 (glyphs and rings only).
export const lightPalette: Palette = {
  canvas: "#f7f7f9",
  surface: "#ffffff",
  raised: "#f1f1f4",
  overlay: "#e7e7ec",
  elevated: "#ffffff",
  hover: "rgba(17, 17, 26, 0.05)",

  line: "rgba(17, 17, 26, 0.09)",
  lineStrong: "rgba(17, 17, 26, 0.18)",

  fg: "#18181b",
  fgMuted: "#52525b",
  fgSubtle: "#65656f",
  fgFaint: "#8a8a95",

  accent: "#f8a326",
  accentHover: "#eb940f",
  accentFg: "#1c1203",
  accentSoft: "rgba(248, 163, 38, 0.16)",
  accentText: "#9a4d00",
  accentTextHover: "#763a00",
  accentLine: "#c26a00",
  pink: "#bd2372",
  violet: "#6045d8",

  // The status colours are deep enough to be text. Their soft backgrounds are
  // tints of a brighter shade of the same hue: a tint of the deep colour is
  // muddy (brown for warning, grey-green for success).
  success: "#156f37",
  successSoft: "rgba(34, 197, 94, 0.14)",
  warning: "#8a5700",
  warningSoft: "rgba(245, 158, 11, 0.18)",
  danger: "#be1f1f",
  dangerSoft: "rgba(239, 68, 68, 0.11)",
  info: "#1b5ac4",
  infoSoft: "rgba(59, 130, 246, 0.11)",

  node: {
    start: "#156f37",
    say: "#1b5ac4",
    ask: "#9a4d00",
    branch: "#6045d8",
    end: "#bd2372",
    transfer: "#0f6e66",
  },
};

// The bright shade behind each light-mode soft status background. Shared by
// every theme, so success, warning, danger and info stay recognisable.
export const STATUS_TINT = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
} as const;

// ---- The other themes ------------------------------------------------------
// Each is written as the colours that were chosen; the rest of a palette
// (soft tints, hairlines, the node colours that repeat a brand colour) is
// derived the same way Aurora's were.

const rgba = (hex: string, alpha: number) => {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

interface Core {
  canvas: string;
  surface: string;
  raised: string;
  overlay: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  fgFaint: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  // Secondary brand colours (Aurora's pink and violet).
  first: string;
  second: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  node: Palette["node"];
}

function dark(core: Core): Palette {
  const { first, second, ...rest } = core;
  return {
    ...rest,
    elevated: core.raised,
    hover: "rgba(255, 255, 255, 0.05)",
    line: "rgba(255, 255, 255, 0.08)",
    lineStrong: "rgba(255, 255, 255, 0.16)",
    accentSoft: rgba(core.accent, 0.14),
    accentText: core.accent,
    accentTextHover: core.accentHover,
    accentLine: core.accent,
    pink: first,
    violet: second,
    successSoft: rgba(core.success, 0.14),
    warningSoft: rgba(core.warning, 0.14),
    dangerSoft: rgba(core.danger, 0.14),
    infoSoft: rgba(core.info, 0.14),
  };
}

function light(
  core: Core & { ink: string; accentText: string; accentTextHover: string; accentLine: string },
): Palette {
  const { first, second, ink, ...rest } = core;
  return {
    ...rest,
    elevated: core.surface,
    hover: rgba(ink, 0.05),
    line: rgba(ink, 0.09),
    lineStrong: rgba(ink, 0.18),
    accentSoft: rgba(core.accent, 0.16),
    pink: first,
    violet: second,
    successSoft: rgba(STATUS_TINT.success, 0.14),
    warningSoft: rgba(STATUS_TINT.warning, 0.18),
    dangerSoft: rgba(STATUS_TINT.danger, 0.11),
    infoSoft: rgba(STATUS_TINT.info, 0.11),
  };
}

// Voltage: the same structure pushed cooler. Blue-black surfaces, cyan and
// indigo as the brand pair, and the warm accent sharpened to lemon. Warning
// moves to orange so it cannot be mistaken for the accent.
const voltage: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#05070d",
    surface: "#0a0e18",
    raised: "#111726",
    overlay: "#182033",
    fg: "#f1f5f9",
    fgMuted: "#a3aec0",
    fgSubtle: "#8591a6",
    fgFaint: "#566178",
    accent: "#f5e04a",
    accentHover: "#fbec7a",
    accentFg: "#1a1700",
    first: "#22d3ee",
    second: "#8494ff",
    success: "#34d399",
    warning: "#fb923c",
    danger: "#fb7185",
    info: "#60a5fa",
    node: { start: "#34d399", say: "#38bdf8", ask: "#f5e04a", branch: "#8494ff", end: "#f472b6", transfer: "#fb923c" },
  }),
  light: light({
    canvas: "#f5f7fb",
    surface: "#ffffff",
    raised: "#edf1f7",
    overlay: "#e1e7f0",
    ink: "#0d1424",
    fg: "#101522",
    fgMuted: "#47516a",
    fgSubtle: "#59647c",
    fgFaint: "#8490a6",
    accent: "#f2d81f",
    accentHover: "#e3c80d",
    accentFg: "#1a1700",
    accentText: "#6b5b00",
    accentTextHover: "#4f4300",
    accentLine: "#8f7a00",
    first: "#0a6a7d",
    second: "#4450d6",
    success: "#0f6e45",
    warning: "#a1470a",
    danger: "#be2445",
    info: "#1d5fc2",
    node: { start: "#0f6e45", say: "#0a6a7d", ask: "#6b5b00", branch: "#4450d6", end: "#b0257a", transfer: "#a8460a" },
  }),
};

// Marigold: the warm end. Brown-black "ink" surfaces and paper-toned light
// ones, a fuller marigold accent, terracotta and plum as the brand pair.
const marigold: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#0b0907",
    surface: "#13100c",
    raised: "#1b1712",
    overlay: "#241f18",
    fg: "#f6f1ea",
    fgMuted: "#b3a898",
    fgSubtle: "#958a79",
    fgFaint: "#746959",
    accent: "#ffae1f",
    accentHover: "#ffc254",
    accentFg: "#1f1300",
    first: "#ec8263",
    second: "#bd98da",
    success: "#84cc7a",
    warning: "#f5d547",
    danger: "#f2706a",
    info: "#7fb0e8",
    node: { start: "#84cc7a", say: "#7fb0e8", ask: "#ffae1f", branch: "#bd98da", end: "#ec8263", transfer: "#2dd4bf" },
  }),
  light: light({
    canvas: "#faf7f2",
    surface: "#ffffff",
    raised: "#f3eee6",
    overlay: "#e9e2d7",
    ink: "#1f1810",
    fg: "#1c1814",
    fgMuted: "#574d42",
    fgSubtle: "#685d51",
    fgFaint: "#91867a",
    accent: "#f5a012",
    accentHover: "#e39008",
    accentFg: "#1f1300",
    accentText: "#8a4700",
    accentTextHover: "#6a3600",
    accentLine: "#b56700",
    first: "#aa4127",
    second: "#7a479b",
    success: "#2c6627",
    warning: "#7d5a00",
    danger: "#b62820",
    info: "#285b98",
    node: { start: "#2c6627", say: "#285b98", ask: "#8a4700", branch: "#7a479b", end: "#aa4127", transfer: "#0f6e66" },
  }),
};

// Jewel: green-black surfaces with teal and sapphire, and the accent turned
// from saffron to a paler gold. The node colours are the other stones:
// emerald, sapphire, gold, amethyst, ruby.
const jewel: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#040a09",
    surface: "#08110f",
    raised: "#0e1a17",
    overlay: "#152420",
    fg: "#eef5f2",
    fgMuted: "#9db0aa",
    fgSubtle: "#80958e",
    fgFaint: "#5a6d64",
    accent: "#e9c46a",
    accentHover: "#f2d68f",
    accentFg: "#1c1500",
    first: "#2dd4bf",
    second: "#7aa2f7",
    success: "#4ade80",
    warning: "#fb9d3c",
    danger: "#f87171",
    info: "#93c5fd",
    node: { start: "#4ade80", say: "#7aa2f7", ask: "#e9c46a", branch: "#b197fc", end: "#f0719b", transfer: "#2dd4bf" },
  }),
  light: light({
    canvas: "#f4f8f6",
    surface: "#ffffff",
    raised: "#eaf1ee",
    overlay: "#dde7e3",
    ink: "#0c1a16",
    fg: "#0f1a17",
    fgMuted: "#43534e",
    fgSubtle: "#55665f",
    fgFaint: "#80918a",
    accent: "#e3b341",
    accentHover: "#d1a02c",
    accentFg: "#1c1500",
    accentText: "#755200",
    accentTextHover: "#573d00",
    accentLine: "#9a6f00",
    first: "#0b6e63",
    second: "#2b5cc2",
    success: "#196838",
    warning: "#9a4a00",
    danger: "#b8262e",
    info: "#235fb0",
    node: { start: "#196838", say: "#2b5cc2", ask: "#755200", branch: "#6b46c9", end: "#b3265e", transfer: "#0f6e66" },
  }),
};

// Mono: everything but the accent is grey, including the two brand
// "colours", so the amber is the only thing that speaks. Status and node
// colours are kept (they carry meaning) but softened.
const mono: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#09090b",
    surface: "#101012",
    raised: "#18181b",
    overlay: "#202024",
    fg: "#fafafa",
    fgMuted: "#a8a8b0",
    fgSubtle: "#8a8a94",
    fgFaint: "#66666f",
    accent: "#ffb224",
    accentHover: "#ffc555",
    accentFg: "#1c1203",
    first: "#d4d4d8",
    second: "#9a9aa6",
    success: "#86d39a",
    warning: "#f0c36a",
    danger: "#f09090",
    info: "#8ab4f8",
    node: { start: "#86d39a", say: "#8ab4f8", ask: "#ffb224", branch: "#b4a7f5", end: "#f09aa9", transfer: "#2dd4bf" },
  }),
  light: light({
    canvas: "#f8f8f8",
    surface: "#ffffff",
    raised: "#f0f0f1",
    overlay: "#e5e5e7",
    ink: "#111113",
    fg: "#111113",
    fgMuted: "#4a4a52",
    fgSubtle: "#62626b",
    fgFaint: "#8a8a93",
    accent: "#f7a81b",
    accentHover: "#e89909",
    accentFg: "#1c1203",
    accentText: "#8a4a00",
    accentTextHover: "#6a3800",
    accentLine: "#b56a00",
    first: "#3f3f46",
    second: "#62626b",
    success: "#1f6b3a",
    warning: "#805500",
    danger: "#b02a2a",
    info: "#2a5db0",
    node: { start: "#1f6b3a", say: "#2a5db0", ask: "#8a4a00", branch: "#5b48c2", end: "#a8325e", transfer: "#0f6e66" },
  }),
};

// Neon Dusk: the loud one. Deep purple surfaces, pure white text, hot
// magenta and electric violet, a brighter yellow accent and status colours
// turned up to match.
const neon: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#06030f",
    surface: "#0d0820",
    raised: "#150e2e",
    overlay: "#1e153d",
    fg: "#ffffff",
    fgMuted: "#b9b0d6",
    fgSubtle: "#9a91bd",
    fgFaint: "#665d8f",
    accent: "#ffd23f",
    accentHover: "#ffe07a",
    accentFg: "#1a1400",
    first: "#ff5cab",
    second: "#a587ff",
    success: "#3dffa2",
    warning: "#ff9f43",
    danger: "#ff6b86",
    info: "#4cc9ff",
    node: { start: "#3dffa2", say: "#4cc9ff", ask: "#ffd23f", branch: "#a587ff", end: "#ff5cab", transfer: "#ff9f45" },
  }),
  light: light({
    canvas: "#f8f5ff",
    surface: "#ffffff",
    raised: "#efeafc",
    overlay: "#e2daf7",
    ink: "#1a0f3d",
    fg: "#140c2e",
    fgMuted: "#473c6e",
    fgSubtle: "#5c5185",
    fgFaint: "#877dab",
    accent: "#ffd23f",
    accentHover: "#f2c21f",
    accentFg: "#1a1400",
    accentText: "#735000",
    accentTextHover: "#563c00",
    accentLine: "#9c6f00",
    first: "#b81572",
    second: "#5b34d6",
    success: "#0b6b45",
    warning: "#9a4a00",
    danger: "#c21840",
    info: "#0a6599",
    node: { start: "#0b6b45", say: "#0a6599", ask: "#735000", branch: "#5b34d6", end: "#b81572", transfer: "#a8460a" },
  }),
};

// ---- Themes with no yellow in them ------------------------------------------
// In each, a status colour that would sit next to the accent moves away from
// it: info turns cyan beside a blue accent, success turns lime beside mint,
// danger turns crimson beside coral.

// Cobalt: azure on blue-black. The accent is the blue, so "info" (and the
// Say node) move to cyan.
const cobalt: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#04070f",
    surface: "#090e1b",
    raised: "#0f1629",
    overlay: "#172038",
    fg: "#eef3fb",
    fgMuted: "#a0acc2",
    fgSubtle: "#8390a8",
    fgFaint: "#5b6781",
    accent: "#4d9fff",
    accentHover: "#7ab8ff",
    accentFg: "#03152e",
    first: "#7de3f4",
    second: "#a78bfa",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#f87171",
    info: "#38d6e8",
    node: { start: "#4ade80", say: "#38d6e8", ask: "#4d9fff", branch: "#a78bfa", end: "#f472b6", transfer: "#fb923c" },
  }),
  light: light({
    canvas: "#f4f7fc",
    surface: "#ffffff",
    raised: "#ebf0f8",
    overlay: "#dee6f2",
    ink: "#0b1630",
    fg: "#0e1626",
    fgMuted: "#445069",
    fgSubtle: "#57637c",
    fgFaint: "#7d8aa2",
    accent: "#2f6fed",
    accentHover: "#1f5cd6",
    accentFg: "#ffffff",
    accentText: "#1f55c4",
    accentTextHover: "#173f94",
    accentLine: "#2f6fed",
    first: "#0a6a7d",
    second: "#5b3fd0",
    success: "#156f37",
    warning: "#8a5700",
    danger: "#be1f1f",
    info: "#0b6878",
    node: { start: "#156f37", say: "#0b6878", ask: "#1f55c4", branch: "#5b3fd0", end: "#b0257a", transfer: "#a8460a" },
  }),
};

// Mint: a single green with silver-grey secondaries, so nothing competes
// with it. "Success" (and the Start node) become lime to stay apart from it.
const mint: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#050908",
    surface: "#0a100e",
    raised: "#111916",
    overlay: "#18231f",
    fg: "#f0f5f3",
    fgMuted: "#a0b0aa",
    fgSubtle: "#82938c",
    fgFaint: "#5a6d64",
    accent: "#4fe3a8",
    accentHover: "#86f0c5",
    accentFg: "#02241a",
    first: "#c9d6d1",
    second: "#8fb3aa",
    success: "#a3e635",
    warning: "#fbbf24",
    danger: "#f87171",
    info: "#60a5fa",
    node: { start: "#a3e635", say: "#60a5fa", ask: "#4fe3a8", branch: "#b4a7f5", end: "#f472b6", transfer: "#fb923c" },
  }),
  light: light({
    canvas: "#f5f8f7",
    surface: "#ffffff",
    raised: "#ebf1ef",
    overlay: "#dfe8e5",
    ink: "#0c1a16",
    fg: "#0f1a17",
    fgMuted: "#43534e",
    fgSubtle: "#55665f",
    fgFaint: "#80918a",
    accent: "#19c189",
    accentHover: "#12ab78",
    accentFg: "#02241a",
    accentText: "#0a6b4b",
    accentTextHover: "#074f37",
    accentLine: "#0c8a61",
    first: "#4a5a55",
    second: "#566862",
    success: "#4a6600",
    warning: "#8a5700",
    danger: "#be1f1f",
    info: "#1b5ac4",
    node: { start: "#4a6600", say: "#1b5ac4", ask: "#0a6b4b", branch: "#6045d8", end: "#bd2372", transfer: "#a8460a" },
  }),
};

// Coral: red-orange on warm charcoal, with rose and mauve. "Danger" becomes
// a cooler, deeper crimson; with its icon and tint it does not read as the
// accent.
const coral: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#0b0808",
    surface: "#131010",
    raised: "#1b1717",
    overlay: "#241f1f",
    fg: "#f7f2f1",
    fgMuted: "#b5aaa8",
    fgSubtle: "#978b89",
    fgFaint: "#746866",
    accent: "#ff7a66",
    accentHover: "#ff9c8c",
    accentFg: "#2b0a05",
    first: "#f4a3b8",
    second: "#c4a7e7",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#ff4d7d",
    info: "#60a5fa",
    node: { start: "#4ade80", say: "#60a5fa", ask: "#ff7a66", branch: "#c4a7e7", end: "#e879f9", transfer: "#2dd4bf" },
  }),
  light: light({
    canvas: "#faf7f6",
    surface: "#ffffff",
    raised: "#f3eeec",
    overlay: "#e9e2df",
    ink: "#1f1412",
    fg: "#1c1716",
    fgMuted: "#574c4a",
    fgSubtle: "#695d5b",
    fgFaint: "#938785",
    accent: "#f2634e",
    accentHover: "#e0513c",
    accentFg: "#2b0a05",
    accentText: "#ad3020",
    accentTextHover: "#872417",
    accentLine: "#d4472f",
    first: "#a83258",
    second: "#6f4bb0",
    success: "#156f37",
    warning: "#8a5700",
    danger: "#ab0f45",
    info: "#1b5ac4",
    node: { start: "#156f37", say: "#1b5ac4", ask: "#ad3020", branch: "#6f4bb0", end: "#a21caf", transfer: "#0f6e66" },
  }),
};

// Glacier: periwinkle on cool slate, with ice blue and near-white as the
// brand pair. The quietest of the coloured themes.
const glacier: Record<ThemeMode, Palette> = {
  dark: dark({
    canvas: "#07080c",
    surface: "#0d0f16",
    raised: "#141722",
    overlay: "#1c2030",
    fg: "#f2f4f8",
    fgMuted: "#a5abbb",
    fgSubtle: "#878ea1",
    fgFaint: "#5f667a",
    accent: "#a5b4fc",
    accentHover: "#c7d0fe",
    accentFg: "#0f1440",
    first: "#7dd3fc",
    second: "#e2e8f0",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#fb7185",
    info: "#22d3ee",
    node: { start: "#4ade80", say: "#22d3ee", ask: "#a5b4fc", branch: "#f0abfc", end: "#fb7185", transfer: "#fb923c" },
  }),
  light: light({
    canvas: "#f6f7fb",
    surface: "#ffffff",
    raised: "#eef0f7",
    overlay: "#e2e5f0",
    ink: "#101530",
    fg: "#12141f",
    fgMuted: "#474c60",
    fgSubtle: "#5a6075",
    fgFaint: "#868ca1",
    accent: "#5766e8",
    accentHover: "#4553d4",
    accentFg: "#ffffff",
    accentText: "#3d49c9",
    accentTextHover: "#2f389e",
    accentLine: "#5766e8",
    first: "#0b6a94",
    second: "#475069",
    success: "#156f37",
    warning: "#8a5700",
    danger: "#be1f4f",
    info: "#0a6a7d",
    node: { start: "#156f37", say: "#0a6a7d", ask: "#3d49c9", branch: "#a21caf", end: "#be1f4f", transfer: "#a8460a" },
  }),
};

export const brandPalettes: Record<Brand, Record<ThemeMode, Palette>> = {
  aurora: { dark: darkPalette, light: lightPalette },
  voltage,
  marigold,
  jewel,
  mono,
  neon,
  cobalt,
  mint,
  coral,
  glacier,
};

// ---- Elevation -------------------------------------------------------------
// Part of the palette: shadows on white are lighter and softer, and the focus
// ring is drawn in the theme's accent.

export interface Shadows {
  readonly pop: string;
  readonly node: string;
  readonly focus: string;
  // The colour a floating surface casts, for shadows that are drawn as a
  // blurred shape rather than a box-shadow (the site nav's morphing surface).
  readonly ambient: string;
}

export function shadowsFor(palette: Palette, mode: ThemeMode): Shadows {
  return mode === "dark"
    ? {
        pop: "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)",
        node: "0 4px 16px rgba(0, 0, 0, 0.4)",
        focus: `0 0 0 3px ${rgba(palette.accent, 0.25)}`,
        ambient: "rgba(0, 0, 0, 0.55)",
      }
    : {
        pop: "0 12px 32px rgba(17, 17, 26, 0.1), 0 2px 6px rgba(17, 17, 26, 0.05), 0 0 0 1px rgba(17, 17, 26, 0.06)",
        node: "0 1px 2px rgba(17, 17, 26, 0.05), 0 4px 12px rgba(17, 17, 26, 0.05)",
        // A crisp line (3:1 or better) with a soft halo: a pale glow alone
        // vanishes on white.
        focus: `0 0 0 1px ${palette.accentLine}, 0 0 0 4px ${rgba(palette.accent, 0.35)}`,
        ambient: "rgba(17, 17, 26, 0.16)",
      };
}
