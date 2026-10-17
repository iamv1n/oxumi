// Zoomed crops of the logo comparison page, for judging small sizes.
//
//   node scripts/shot-zoom.mjs <path> <selector> <out.png> [--scale=8] [--dpr=1]
//                              [--theme=dark|light] [--width=1440]
//
// The page is asked from the public site (apps/site, where /preview/logos and
// /brand live). BASE points it at another server, e.g. the app:
// BASE=http://localhost:3100.
//
// Captures every element matching the selector at the given device pixel
// ratio, stacks them, and enlarges the result without smoothing, so each
// device pixel can be seen.
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:3000";
const [path, selector, out, ...flags] = process.argv.slice(2);
const num = (name, fallback) => Number(flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const theme = flags.find((f) => f.startsWith("--theme="))?.split("=")[1] ?? "dark";
const scale = num("scale", 8);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: num("width", 1440), height: num("height", 900) },
  deviceScaleFactor: num("dpr", 1),
});
await page.context().addCookies([
  { name: "cf-theme", value: theme, url: base },
  { name: "cf-theme-mode", value: theme, url: base },
]);
await page.addInitScript((value) => {
  try {
    window.localStorage.setItem("cf-theme", value);
  } catch {}
}, theme);
await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
// --click="Button name" presses buttons first (repeatable), e.g. a toggle.
for (const flag of flags.filter((f) => f.startsWith("--click="))) {
  await page.getByRole("button", { name: flag.slice(8), exact: true }).first().click();
  await page.waitForTimeout(400);
}

const shots = [];
for (const element of await page.locator(selector).all()) {
  shots.push((await element.screenshot()).toString("base64"));
}
const view = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
await view.setContent(
  `<body style="margin:0;background:#888;display:inline-flex;flex-wrap:wrap;gap:6px;padding:6px;max-width:${num("wrap", 1900)}px">${shots
    .map((b) => `<img src="data:image/png;base64,${b}" onload="this.width=this.naturalWidth*${scale}" style="image-rendering:pixelated;display:block">`)
    .join("")}</body>`,
);
await view.waitForTimeout(300);
await view.locator("body").screenshot({ path: out });
console.log(`saved ${out} (${shots.length} crops)`);
await browser.close();
