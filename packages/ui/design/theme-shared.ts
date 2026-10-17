import { type Brand, brandPalettes, BRANDS, DEFAULT_BRAND, type ThemeMode } from "./palettes";

// The parts of theme switching that the server and the browser both need.
// No React here: the root layout (a server component) imports this.

export type { Brand, ThemeMode };
// What the user chose. "system" follows the operating system.
export type ThemePreference = ThemeMode | "system";

// localStorage key and cookie name for the preference.
export const THEME_KEY = "cf-theme";
// Cookie holding the mode last shown, so the server can render it.
export const THEME_MODE_COOKIE = "cf-theme-mode";
// localStorage key and cookie name for the brand theme.
export const THEME_BRAND_KEY = "cf-brand";

// Pages and controls meant for the team, not for visitors: the Theme Lab, the
// brand kit at /brand and everything under /preview. They exist in
// development and are left out of production builds.
export const INTERNAL_PAGES = process.env.NODE_ENV !== "production";

// The Theme Lab is an experiment: the floating "Themes" button and its panel
// (theme/ThemeLab.tsx), plus the "Themes" entries in the site nav
// and footer. When it is off all of them are removed and a stored theme is
// ignored, so everyone sees the default theme (DEFAULT_BRAND in palettes.ts).
export const THEME_LAB_ENABLED = INTERNAL_PAGES;

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export const parsePreference = (value: unknown): ThemePreference | null =>
  value === "light" || value === "dark" || value === "system" ? value : null;

export const parseMode = (value: unknown): ThemeMode | null =>
  value === "light" || value === "dark" ? value : null;

export const parseBrand = (value: unknown): Brand | null =>
  THEME_LAB_ENABLED && BRANDS.includes(value as Brand) ? (value as Brand) : null;

// The browser's toolbar colour for a theme and mode.
export const themeColor = (mode: ThemeMode, brand: Brand = DEFAULT_BRAND): string =>
  brandPalettes[brand][mode].canvas;

const TOOLBAR = JSON.stringify(
  Object.fromEntries(
    BRANDS.map((brand) => [brand, [themeColor("dark", brand), themeColor("light", brand)]]),
  ),
);

// Runs in <head> before anything is painted: works out the mode from the
// stored preference (or the OS) and the brand theme, and sets both on <html>,
// so the page never flashes the wrong colours. Kept dependency-free and tiny;
// theme-mode.tsx takes over once React is running.
export const themeScript = `(function(){var d=document.documentElement,m="dark",b="${DEFAULT_BRAND}",T=${TOOLBAR};try{var get=function(k){var v=null;try{v=localStorage.getItem(k)}catch(e){}if(!v){var c=document.cookie.match(new RegExp("(?:^|; )"+k+"=([a-z]+)"));v=c?c[1]:null}return v};var p=get("${THEME_KEY}");if(p!=="light"&&p!=="dark")p="system";m=p==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var s=${THEME_LAB_ENABLED ? `get("${THEME_BRAND_KEY}")` : "null"};if(s&&T[s])b=s;document.cookie="${THEME_MODE_COOKIE}="+m+"; path=/; max-age=31536000; samesite=lax";var t=document.createElement("meta");t.name="theme-color";t.content=T[b][m==="light"?1:0];document.head.appendChild(t)}catch(e){}d.setAttribute("data-theme",m);if(b!=="${DEFAULT_BRAND}")d.setAttribute("data-brand",b)})()`;
