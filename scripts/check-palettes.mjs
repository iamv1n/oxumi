// Computes the contrast ratios the design relies on, for every brand theme in
// both modes, and exits non-zero if one falls short.
//
//   node scripts/check-palettes.mjs            a table of every check
//   node scripts/check-palettes.mjs --quiet    failures only
//
// The rules (WCAG 2 contrast):
//   4.5:1  fg, fgMuted, fgSubtle, accentText, the two brand colours, the status
//          colours and the five node colours, on canvas, surface and raised;
//          accentFg on accent and accentHover; each status colour (and
//          accentText) on its own soft background over surface.
//   3:1    fgFaint and accentLine on canvas and surface (glyphs, rings).
// Aurora's dark palette predates these rules and is kept exactly as it was;
// where it falls short it is reported as "legacy" rather than failed.
import { brandPalettes, BRANDS } from "../packages/ui/design/palettes.ts";

const quiet = process.argv.includes("--quiet");
const parse = (value) => {
  if (value.startsWith("#")) {
    const n = parseInt(value.slice(1), 16);
    return { rgb: [n >> 16, (n >> 8) & 255, n & 255], a: 1 };
  }
  const [r, g, b, a = "1"] = value.match(/[\d.]+/g);
  return { rgb: [+r, +g, +b], a: +a };
};
// A colour (possibly translucent) painted over a solid one.
const over = (top, under) => {
  const t = parse(top), u = parse(under);
  return t.rgb.map((c, i) => Math.round(c * t.a + u.rgb[i] * (1 - t.a)));
};
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(parse(a).rgb ?? a), luminance(Array.isArray(b) ? b : parse(b).rgb)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

let failures = 0, legacy = 0;
const rows = [];
for (const brand of BRANDS) {
  for (const mode of ["dark", "light"]) {
    const p = brandPalettes[brand][mode];
    const checks = [];
    const add = (name, fg, bg, bgName, min) => checks.push({ name, on: bgName, value: ratio(fg, bg), min });
    const text = { fg: p.fg, fgMuted: p.fgMuted, fgSubtle: p.fgSubtle, accentText: p.accentText, pink: p.pink, violet: p.violet,
      success: p.success, warning: p.warning, danger: p.danger, info: p.info,
      "node.start": p.node.start, "node.say": p.node.say, "node.ask": p.node.ask, "node.branch": p.node.branch, "node.end": p.node.end };
    for (const [name, value] of Object.entries(text))
      for (const bg of ["canvas", "surface", "raised"]) add(name, value, p[bg], bg, 4.5);
    for (const name of ["fgFaint", "accentLine"])
      for (const bg of ["canvas", "surface"]) add(name, p[name], p[bg], bg, 3);
    add("accentFg", p.accentFg, p.accent, "accent", 4.5);
    add("accentFg", p.accentFg, p.accentHover, "accentHover", 4.5);
    for (const [name, soft] of [["accentText", "accentSoft"], ["success", "successSoft"], ["warning", "warningSoft"], ["danger", "dangerSoft"], ["info", "infoSoft"]])
      add(name, p[name], over(p[soft], p.surface), `${soft}/surface`, 4.5);
    for (const check of checks) {
      const short = check.value < check.min;
      const isLegacy = short && brand === "aurora" && mode === "dark";
      if (short && !isLegacy) failures++;
      if (isLegacy) legacy++;
      if (!quiet || short) rows.push(`${short ? (isLegacy ? "legacy" : "FAIL  ") : "ok    "} ${brand.padEnd(9)} ${mode.padEnd(5)} ${check.name.padEnd(12)} on ${check.on.padEnd(20)} ${check.value.toFixed(2).padStart(6)}  (min ${check.min})`);
    }
    // The summary line people read: the lowest ratio in each group.
    const low = (names, bgs) => Math.min(...checks.filter((c) => names.includes(c.name) && bgs.includes(c.on)).map((c) => c.value)).toFixed(2);
    const main = ["canvas", "surface", "raised"];
    rows.push(`summary ${brand.padEnd(9)} ${mode.padEnd(5)} fg ${low(["fg"], main)}  muted ${low(["fgMuted"], main)}  subtle ${low(["fgSubtle"], main)}  faint ${low(["fgFaint"], main)}  accentText ${low(["accentText"], main)}  accentLine ${low(["accentLine"], main)}  accentFg/accent ${low(["accentFg"], ["accent", "accentHover"])}  brand ${low(["pink", "violet"], main)}  status ${low(["success", "warning", "danger", "info"], main)}  nodes ${low(["node.start", "node.say", "node.ask", "node.branch", "node.end"], main)}  on-soft ${Math.min(...checks.filter((c) => c.on.endsWith("/surface")).map((c) => c.value)).toFixed(2)}`);
  }
}
console.log(rows.filter((r) => !quiet || !r.startsWith("ok")).join("\n"));
console.log(`\n${failures} failing, ${legacy} legacy (Aurora dark, kept as designed)`);
process.exit(failures ? 1 : 0);
