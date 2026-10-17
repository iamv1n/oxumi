"use client";

import { createGlobalStyle } from "styled-components";
import { type Brand, BRANDS, DEFAULT_BRAND, paletteVars, type ThemeMode } from "./tokens";
import { type } from "./typography";

// The colour variables behind `theme.color` and `theme.shadow`: one set for
// each brand theme and mode. <html data-theme> picks the mode and
// <html data-brand> the theme (see theme-mode.tsx); a nested [data-theme]
// re-scopes everything inside it to the other mode.
const block = (mode: ThemeMode, brand?: Brand) => `
  ${paletteVars(mode, brand)}
  color-scheme: ${mode};
`;

// Aurora is the default and needs no attribute; the others are keyed by it.
const otherBrands = BRANDS.filter((brand) => brand !== DEFAULT_BRAND)
  .map(
    (brand) => `
  [data-brand="${brand}"],
  [data-brand="${brand}"] [data-theme="dark"] {${block("dark", brand)}}
  [data-brand="${brand}"][data-theme="light"],
  [data-brand="${brand}"] [data-theme="light"] {${block("light", brand)}}`,
  )
  .join("\n");

export const GlobalStyle = createGlobalStyle`
  :root,
  [data-theme="dark"] {
    ${block("dark")}
  }
  /* Only reached if the inline script could not run: follow the OS. */
  @media (prefers-color-scheme: light) {
    :root:not([data-theme]) {
      ${block("light")}
    }
  }
  [data-theme="light"] {
    ${block("light")}
  }
  ${otherBrands}
  /* Text colour is inherited as a value, not a variable: restate it wherever
     the variables change. */
  [data-theme] {
    color: ${({ theme }) => theme.color.fg};
  }
  /* Switching mode repaints everything in one frame. */
  [data-theme-switching],
  [data-theme-switching] *,
  [data-theme-switching] *::before,
  [data-theme-switching] *::after {
    transition: none !important;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html {
    height: 100%;
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
  }

  body {
    margin: 0;
    min-height: 100%;
    background: ${({ theme }) => theme.color.canvas};
    color: ${({ theme }) => theme.color.fg};
    ${type("body")}
  }

  h1, h2, h3, h4, p, ul, ol, dl, dd, figure { margin: 0; padding: 0; }
  ul, ol { list-style: none; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; }
  img, svg, canvas { display: block; }

  ::selection {
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.fg};
  }

  :focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }

  ${({ theme }) => theme.media.reducedMotion} {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
