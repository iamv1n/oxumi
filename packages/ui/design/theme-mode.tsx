"use client";

import { ConfigProvider } from "antd";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { antdTheme } from "./antd-theme";
import { DEFAULT_BRAND } from "./palettes";
import {
  type Brand,
  parseBrand,
  parsePreference,
  THEME_BRAND_KEY,
  THEME_KEY,
  THEME_MODE_COOKIE,
  themeColor,
  type ThemeMode,
  type ThemePreference,
} from "./theme-shared";

// Light and dark mode, and the brand theme. The user's mode preference
// ("light", "dark" or "system") and chosen theme live in localStorage and
// cookies; what they resolve to is written to <html data-theme> and
// <html data-brand>, which is what the colour variables in GlobalStyle key
// off. An inline script (theme-shared.ts) does this before first paint; this
// module keeps it current afterwards and tells React about it.

export interface ThemeState {
  preference: ThemePreference;
  mode: ThemeMode;
  brand: Brand;
}

// What the server renders when it has no cookie to go on.
const FALLBACK: ThemeState = { preference: "system", mode: "dark", brand: DEFAULT_BRAND };

let state: ThemeState | null = null;
const listeners = new Set<() => void>();

const systemQuery = () => window.matchMedia("(prefers-color-scheme: light)");

const resolve = (preference: ThemePreference): ThemeMode =>
  preference === "system" ? (systemQuery().matches ? "light" : "dark") : preference;

// localStorage first, then the cookie (storage can be blocked).
function stored(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  } catch {
    // Fall through to the cookie.
  }
  return document.cookie.match(new RegExp(`(?:^|; )${key}=([a-z]+)`))?.[1] ?? null;
}

function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Still applies for this visit, and the cookie remembers it.
  }
  writeCookie(key, value);
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// Push a state out to the document: the attributes the CSS reads, the browser
// toolbar colour, and the cookie the server reads on the next request.
function apply(next: ThemeState) {
  const root = document.documentElement;
  const brand = next.brand === DEFAULT_BRAND ? null : next.brand;
  if (root.getAttribute("data-theme") !== next.mode || root.getAttribute("data-brand") !== brand) {
    // Every colour changes at once; without this, each element would fade at
    // the speed of its own hover transition.
    root.setAttribute("data-theme-switching", "");
    root.setAttribute("data-theme", next.mode);
    if (brand) root.setAttribute("data-brand", brand);
    else root.removeAttribute("data-brand");
    window.setTimeout(() => root.removeAttribute("data-theme-switching"), 60);
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColor(next.mode, next.brand));
  writeCookie(THEME_MODE_COOKIE, next.mode);
}

function current(): ThemeState {
  if (!state) {
    const preference = parsePreference(stored(THEME_KEY)) ?? "system";
    const brand = parseBrand(stored(THEME_BRAND_KEY)) ?? DEFAULT_BRAND;
    state = { preference, mode: resolve(preference), brand };
  }
  return state;
}

function update(change: Partial<Pick<ThemeState, "preference" | "brand">>, fade = false) {
  const previous = current();
  const preference = change.preference ?? previous.preference;
  const brand = change.brand ?? previous.brand;
  const mode = resolve(preference);
  const changed =
    previous.preference !== preference || previous.mode !== mode || previous.brand !== brand;
  const commit = () => {
    if (changed) {
      state = { preference, mode, brand };
      listeners.forEach((listener) => listener());
    }
    apply(current());
  };
  // A short cross-fade of the whole page where the browser can do one.
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fade && changed && !still && "startViewTransition" in document) {
    document.startViewTransition(commit);
  } else {
    commit();
  }
}

// The OS switched between light and dark: only matters in "system".
const onSystemChange = () => update({});
// Another tab changed the preference or the theme.
const onStorage = (event: StorageEvent) => {
  if (event.key === THEME_KEY || event.key === THEME_BRAND_KEY || event.key === null) {
    update({
      preference: parsePreference(stored(THEME_KEY)) ?? "system",
      brand: parseBrand(stored(THEME_BRAND_KEY)) ?? DEFAULT_BRAND,
    });
  }
};

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    systemQuery().addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    apply(current());
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      systemQuery().removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function setThemePreference(preference: ThemePreference) {
  remember(THEME_KEY, preference);
  update({ preference });
}

export function setThemeBrand(brand: Brand) {
  remember(THEME_BRAND_KEY, brand);
  update({ brand }, true);
}

const SeedContext = createContext<ThemeState>(FALLBACK);

// The user's mode preference, the mode it resolves to right now, the brand
// theme, and setters. `mode` is what to render for: it follows the OS live
// in "system".
export function useThemeMode() {
  const seed = useContext(SeedContext);
  const { preference, mode, brand } = useSyncExternalStore(subscribe, current, () => seed);
  return {
    preference,
    mode,
    brand,
    setPreference: setThemePreference,
    setBrand: setThemeBrand,
  };
}

// Ant Design computes its colours in JavaScript, so it needs to be told the
// mode and theme rather than reading the CSS variables.
export function AntdThemed({ children }: { children: ReactNode }) {
  const { mode, brand } = useThemeMode();
  return <ConfigProvider theme={antdTheme(mode, brand)}>{children}</ConfigProvider>;
}

// Tells the client components below what the server knew about the theme
// (from cookies), so their server-rendered HTML already matches. Rendered by
// <ThemeSeed>; without it the server assumes dark Aurora.
export function ThemeSeedProvider({
  preference,
  mode,
  brand,
  children,
}: ThemeState & { children: ReactNode }) {
  const seed = useMemo(() => ({ preference, mode, brand }), [preference, mode, brand]);
  return (
    <SeedContext.Provider value={seed}>
      <AntdThemed>{children}</AntdThemed>
    </SeedContext.Provider>
  );
}
