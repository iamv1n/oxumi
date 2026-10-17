import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ThemeSeedProvider } from "./theme-mode";
import { DEFAULT_BRAND } from "./palettes";
import {
  parseBrand,
  parseMode,
  parsePreference,
  THEME_BRAND_KEY,
  THEME_KEY,
  THEME_MODE_COOKIE,
} from "./theme-shared";

// Reads the theme cookies on the server so the first HTML is rendered for the
// right mode and brand theme. The colour variables never need this (an inline script sets
// them before paint), but Ant Design's styles do: without it, server-rendered
// inputs and buttons would be dark until the page hydrates.
//
// Reading cookies makes a route dynamic, so wrap only pages that render Ant
// Design on the server and follow the preference (the auth pages). The
// marketing site is dark only and stays static.
export default async function ThemeSeed({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const preference = parsePreference(jar.get(THEME_KEY)?.value) ?? "system";
  const mode =
    preference === "system"
      ? (parseMode(jar.get(THEME_MODE_COOKIE)?.value) ?? "dark")
      : preference;
  const brand = parseBrand(jar.get(THEME_BRAND_KEY)?.value) ?? DEFAULT_BRAND;
  return (
    <ThemeSeedProvider preference={preference} mode={mode} brand={brand}>
      {children}
    </ThemeSeedProvider>
  );
}
