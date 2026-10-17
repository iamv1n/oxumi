// Builds the downloadable brand kit in apps/site/public/brand.
//
//   node scripts/build-brand-kit.mjs
//
// The drawings are not copied into this script. It asks the running site
// (apps/site in development; BASE, default http://localhost:3000) for the
// list of files and for each one's SVG, which the site builds with the same code as the logo components
// and the /brand page, so the files cannot drift from them. PNGs are
// rasterised with Playwright's Chromium; banner headlines get the site's
// display serif embedded by the /brand page itself; the zip is made with
// the system `zip` command. Nothing else is needed.
//
// The app (apps/web) is a separate deployment with its own web manifest, so
// the three home-screen icons that manifest names are also copied to
// apps/web/public/brand/icons.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.BASE ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "../apps/site/public/brand");

const manifest = await (await fetch(`${base}/brand/asset?manifest=1`)).json();
rmSync(out, { recursive: true, force: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
// The /brand page knows how to embed the fonts a banner's text needs.
const site = await browser.newPage();
await site.goto(`${base}/brand`, { waitUntil: "networkidle" });
await site.waitForFunction(() => Boolean(window.oxumiBrandKit));
const rows = [];

for (const file of manifest.files) {
  const query = new URLSearchParams({ kind: file.kind, id: file.id, colorway: file.colorway });
  if (file.style) query.set("style", file.style);
  if (file.headline) query.set("headline", "1");
  if (file.bleed) query.set("bleed", "1");
  if (file.square) query.set("square", "1");
  if (file.png && file.kind === "design") query.set("px", String(file.png));
  const response = await fetch(`${base}/brand/asset?${query}`);
  if (!response.ok) throw new Error(`${file.path}: ${response.status}`);
  let svg = await response.text();
  if (svg.includes("<text")) {
    svg = await site.evaluate((text) => window.oxumiBrandKit.withFonts(text), svg);
    if (!svg.includes("@font-face")) throw new Error(`${file.path}: the display font could not be embedded`);
  }
  const target = join(out, file.path);
  mkdirSync(dirname(target), { recursive: true });

  let size = "";
  if (file.png) {
    const [, w, h] = svg.match(/width="([\d.]+)" height="([\d.]+)"/).map(Number);
    const width = Math.round(w);
    const height = Math.round(h);
    await page.setViewportSize({ width, height });
    // Fill the viewport exactly, whatever fraction the natural height had.
    await page.setContent(
      `<body style="margin:0;background:transparent">${svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${width}" height="${height}" preserveAspectRatio="none" style="display:block"`)}</body>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: target, omitBackground: true, clip: { x: 0, y: 0, width, height } });
    size = `${width}x${height}`;
  } else {
    writeFileSync(target, svg);
  }
  rows.push([file.path, size, statSync(target).size]);
}
await browser.close();

rmSync(join(out, manifest.zip), { force: true });
execFileSync("zip", ["-q", "-r", "-X", manifest.zip, ".", "-x", manifest.zip], { cwd: out });
rows.push([manifest.zip, "", statSync(join(out, manifest.zip)).size]);

// The app's manifest (apps/web/src/app/manifest.ts) serves these itself.
const appIcons = join(dirname(fileURLToPath(import.meta.url)), "../apps/web/public/brand/icons");
rmSync(appIcons, { recursive: true, force: true });
mkdirSync(appIcons, { recursive: true });
for (const px of [192, 512, 1024]) {
  copyFileSync(join(out, `icons/app-icon-${px}.png`), join(appIcons, `app-icon-${px}.png`));
}

for (const [path, size, bytes] of rows) {
  console.log(`${path.padEnd(48)} ${size.padEnd(10)} ${(bytes / 1024).toFixed(1).padStart(8)} kB`);
}
console.log(`\n${rows.length} files in ${out}`);
