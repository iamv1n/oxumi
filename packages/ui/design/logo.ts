// The Oxumi logo's own colours. The mark is the brand, so it keeps these
// blues in every theme and mode; nothing else in the product should hard-code
// them. Sampled from the owner's brand board.
export const logoColor = {
  // Upper shape: periwinkle, a touch cooler at its left tip.
  upperFrom: "#7ea9ff",
  upperTo: "#878dff",
  // Lower shape: saturated blue, leaning violet at its right tip.
  lowerFrom: "#2b66ff",
  lowerTo: "#4141ff",
  // The dot of the i in the wordmark.
  dot: "#6a8dfe",
  // The app icon's tile, and the glow behind the mark on it.
  tile: "#020716",
  glow: "#2b5cff",
} as const;

// The words that travel with the logo. Change them here and every lockup,
// export, banner and the /brand page follow (then re-run
// scripts/build-brand-kit.mjs to rebuild the downloadable files).
//   TAGLINE    one short line under the wordmark. On trial: the owner may
//              change it again, and this is the only place it is written.
//   HEADLINE   the site's hero line, in two sentences. Banners set it in the
//              display serif, apart from the logo, the second in italic.
//   BRAND_DESCRIPTOR  one sentence on what the product is
export const TAGLINE = "Voice with a plan";
export const HEADLINE = ["Design the call.", "The agent makes it."] as const;
export const BRAND_LINE = HEADLINE.join(" ");
export const BRAND_DESCRIPTOR = "Voice agents that follow your flow and return every answer as data.";
