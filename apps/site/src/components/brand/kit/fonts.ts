import { HEADLINE_FAMILY } from "./socialFormats";

// Banner headlines are real text in the site's display serif. A standalone
// SVG (or a canvas drawing one) cannot see the page's fonts, so the font
// files the page already loaded are embedded in the SVG as data URLs.

let pending: Promise<string> | undefined;

async function build(): Promise<string> {
  const faces: string[] = [];
  for (const sheet of Array.from(window.document.styleSheets)) {
    let rules: CSSRule[];
    try {
      rules = Array.from(sheet.cssRules);
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family");
      // The Latin subset of the display face, upright and italic.
      if (!/instrument.serif/i.test(family) || /fallback/i.test(family)) continue;
      if (!/U\+0+-0*FF\b/i.test(rule.style.getPropertyValue("unicode-range"))) continue;
      const url = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
      if (!url) continue;
      const bytes = new Uint8Array(await (await fetch(new URL(url, sheet.href ?? window.location.href))).arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      faces.push(
        `@font-face{font-family:'${HEADLINE_FAMILY}';font-style:${rule.style.getPropertyValue("font-style") || "normal"};font-weight:400;src:url(data:font/woff2;base64,${btoa(binary)}) format('woff2')}`,
      );
    }
  }
  return faces.join("");
}

// The @font-face rules for the display serif, with the files inlined.
export const displayFontCss = (): Promise<string> => (pending ??= build().catch(() => ""));

// An SVG with text gets the fonts it needs; any other SVG is returned as is.
export function withFonts(svg: string, css: string): string {
  if (!css || !svg.includes("<text")) return svg;
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
}

declare global {
  interface Window {
    // For scripts/build-brand-kit.mjs, which rasterises banners in this page.
    oxumiBrandKit?: { withFonts: (svg: string) => Promise<string> };
  }
}

export function exposeToBuildScript() {
  window.oxumiBrandKit = { withFonts: async (svg) => withFonts(svg, await displayFontCss()) };
}
