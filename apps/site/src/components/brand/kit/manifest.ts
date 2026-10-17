import { PRIMARY_COLORWAY } from "@oxumi/ui/brand/kit/colorways";
import { DESIGNS } from "@oxumi/ui/brand/kit/compose";
import { SOCIAL_FORMATS } from "./socialFormats";

// Every file in the downloadable kit under public/brand. The page lists
// them; scripts/build-brand-kit.mjs reads this list from the running app,
// asks the same code for each SVG and writes the files.
export interface KitFile {
  // Path under public/brand.
  path: string;
  group: "Logo, SVG" | "Logo, PNG" | "Every design" | "Icons" | "Social and banners";
  label: string;
  // What to draw.
  kind: "design" | "social";
  id: string;
  colorway: string;
  style?: string;
  // Banners: add the hero line where the format has room for it.
  headline?: boolean;
  bleed?: boolean;
  square?: boolean;
  // A PNG this many pixels wide; an SVG if absent.
  png?: number;
}

const variants = [
  ["color-on-dark", "clear-dark", "colour, for dark grounds"],
  ["color-on-light", "clear-light", "colour, for light grounds"],
  ["white", "white", "one colour, white"],
  ["black", "black", "one colour, black"],
] as const;

const names = { mark: "Mark", wordmark: "Wordmark", lockup: "Lockup" } as const;

export const kitFiles: readonly KitFile[] = [
  ...(["mark", "wordmark", "lockup"] as const).flatMap((id) =>
    variants.map(
      ([slug, colorway, note]): KitFile => ({ path: `logo/${id}-${slug}.svg`, group: "Logo, SVG", label: `${names[id]}, ${note}`, kind: "design", id, colorway }),
    ),
  ),
  ...[512, 1024].flatMap((px): KitFile[] => [
    { path: `logo/mark-color-${px}.png`, group: "Logo, PNG", label: `Mark, colour, ${px} px, transparent`, kind: "design", id: "mark", colorway: "clear-dark", png: px },
    { path: `logo/lockup-color-on-dark-${px}.png`, group: "Logo, PNG", label: `Lockup for dark grounds, ${px} px, transparent`, kind: "design", id: "lockup", colorway: "clear-dark", png: px },
    { path: `logo/lockup-color-on-light-${px}.png`, group: "Logo, PNG", label: `Lockup for light grounds, ${px} px, transparent`, kind: "design", id: "lockup", colorway: "clear-light", png: px },
  ]),
  ...DESIGNS.flatMap((design): KitFile[] => [
    { path: `designs/${design.id}.svg`, group: "Every design", label: `${design.label}, blue on navy, SVG`, kind: "design", id: design.id, colorway: PRIMARY_COLORWAY },
    { path: `designs/${design.id}.png`, group: "Every design", label: `${design.label}, blue on navy, PNG 1024`, kind: "design", id: design.id, colorway: PRIMARY_COLORWAY, png: 1024 },
  ]),
  ...[1024, 512, 192, 180].map(
    (px): KitFile => ({ path: `icons/app-icon-${px}.png`, group: "Icons", label: `App icon, ${px} px, square`, kind: "design", id: "app-icon", colorway: PRIMARY_COLORWAY, bleed: true, png: px }),
  ),
  ...[32, 16].map(
    (px): KitFile => ({ path: `icons/favicon-${px}.png`, group: "Icons", label: `Favicon, ${px} px, transparent`, kind: "design", id: "mark", colorway: "clear-dark", square: true, png: px }),
  ),
  ...SOCIAL_FORMATS.map(
    (format): KitFile => ({
      path: format.id === "open-graph" ? "og.png" : `social/${format.id}-${format.w}x${format.h}.png`,
      group: "Social and banners",
      label: `${format.where} ${format.label.toLowerCase()}, ${format.w} × ${format.h}`,
      kind: "social",
      id: format.id,
      colorway: PRIMARY_COLORWAY,
      style: "glow",
      headline: format.headline !== null,
      png: format.w,
    }),
  ),
];

export const KIT_ZIP = "oxumi-brand-kit.zip";
