// Checks the /brand page's export actions in a real browser: the copied SVG
// is standalone markup, and downloaded PNGs have the stated pixel size.
//
//   node scripts/check-brand-page.mjs
import { chromium } from "playwright";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.BASE ?? "http://localhost:3000";
const dir = mkdtempSync(join(tmpdir(), "oxumi-brand-"));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
const page = await context.newPage();
await page.goto(`${base}/brand`, { waitUntil: "networkidle" });
let failed = false;
const check = (ok, text) => {
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${text}`);
};
const pngSize = (file) => {
  const data = readFileSync(file);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

// Copy SVG, in two colourways.
for (const colorway of ["Blue on navy", "Aurora"]) {
  await page.getByRole("button", { name: colorway, exact: false }).first().click();
  for (const design of ["lockup", "tagline", "app-icon"]) {
    await page.locator(`[data-design="${design}"] button`, { hasText: "Copy SVG" }).click();
    const svg = await page.evaluate(() => navigator.clipboard.readText());
    const verdict = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const root = doc.documentElement;
      const ids = new Set([...doc.querySelectorAll("[id]")].map((el) => el.id));
      const refs = [...text.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
      return {
        parses: !doc.querySelector("parsererror") && root.nodeName === "svg",
        xmlns: root.getAttribute("xmlns") === "http://www.w3.org/2000/svg",
        viewBox: Boolean(root.getAttribute("viewBox")),
        noVars: !text.includes("var(") && !text.includes("currentColor"),
        refsResolve: refs.every((id) => ids.has(id)),
        noText: !doc.querySelector("text"),
      };
    }, svg);
    check(Object.values(verdict).every(Boolean), `copied SVG, ${design}, ${colorway}: ${JSON.stringify(verdict)}`);
  }
}

// Download PNG at each size.
await page.getByRole("button", { name: "Blue on navy" }).first().click();
for (const size of ["512", "1024", "2048"]) {
  await page.getByRole("group", { name: "PNG size" }).getByRole("button", { name: size, exact: true }).click();
  for (const design of ["mark", "lockup", "app-icon"]) {
    const button = page.locator(`[data-design="${design}"] button`, { hasText: "PNG" });
    const label = (await button.textContent()).trim();
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    const file = join(dir, download.suggestedFilename());
    await download.saveAs(file);
    const [w, h] = pngSize(file);
    check(label === `PNG ${w}×${h}` && Math.max(w, h) === Number(size), `${download.suggestedFilename()} is ${w}x${h} (button said "${label}")`);
  }
}

// Social tiles: each PNG is exactly the stated size, with the headline on,
// and no headline is set under 24 pixels. A fresh page, because Chromium
// stops automatic downloads after ten from one page.
const social = await context.newPage();
await social.goto(`${base}/brand`, { waitUntil: "networkidle" });
await social.getByRole("button", { name: "Logo + headline", exact: true }).click();
await social.waitForTimeout(500);
for (const tile of await social.locator("[data-social]").all()) {
  const textPx = await tile.getAttribute("data-text-px");
  if (textPx) check(Number(textPx) >= 24, `${await tile.getAttribute("data-social")} headline is ${textPx}px`);
  const [w0, h0] = (await tile.getAttribute("data-social-size")).split("x").map(Number);
  const [download] = await Promise.all([social.waitForEvent("download"), tile.locator("button", { hasText: "PNG" }).click()]);
  const file = join(dir, download.suggestedFilename());
  await download.saveAs(file);
  const [w, h] = pngSize(file);
  check(w === w0 && h === h0, `${download.suggestedFilename()} is ${w}x${h}, expected ${w0}x${h0}`);
}

console.log(`files in ${dir}`);
await browser.close();
process.exit(failed ? 1 : 0);
