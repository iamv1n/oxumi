// Screenshot a page of the running site or app so it can be reviewed visually.
//
//   node scripts/shot.mjs <path> <out.png> [--mobile] [--full] [--wait=ms]
//                                          [--y=px] [--height=px] [--anon]
//                                          [--theme=light|dark|system]
//                                          [--site|--app]
//
// There are two servers: the public site (apps/site, port 3000) and the app
// (apps/web, port 3100). The path decides which one is asked: the app's pages
// (/login, /signup, /forgot-password, /reset-password, /account, /projects/…,
// /preview/test-call, /preview/theme) go to the app, everything else to the
// site. --site or --app overrides that.
//
// --full   scrolls through the page first (so scroll-triggered animations
//          fire), then captures the whole page.
// --y      scrolls to this offset and captures one viewport from there.
// --theme  sets the stored theme preference (localStorage and cookie) before
//          the page loads. Without it the app follows the browser, and
//          headless Chromium reports a light OS. Add --os=dark to emulate a
//          dark OS, e.g. with --theme=system.
// --dpr    device pixel ratio (default 2 on mobile). Use --dpr=1 for --full
//          on long mobile pages, which are too tall to capture at 2x.
//
// Other servers, e.g. production builds on other ports:
//   SHOT_SITE  the site's address (default http://localhost:3000)
//   SHOT_APP   the app's address (default http://localhost:3100)
//   SHOT_API   the API's address, for the demo sign-in (default http://localhost:4000)
//   SHOT_BASE  one address for every path, whichever it belongs to
import { chromium } from "playwright";

const [path, out, ...flags] = process.argv.slice(2);
if (!path || !out) {
  console.error("usage: node scripts/shot.mjs <path> <out.png> [flags]");
  process.exit(1);
}
const flag = (name) => flags.includes(`--${name}`);

// The app's pages (apps/web/src/app). Everything else is the site's.
const APP_PATH =
  /^\/(login|signup|forgot-password|reset-password|account|projects|preview\/test-call|preview\/theme)(?=[/?#]|$)/;
const inApp = flag("app") || (!flag("site") && APP_PATH.test(path));
const BASE =
  process.env.SHOT_BASE ??
  (inApp
    ? (process.env.SHOT_APP ?? "http://localhost:3100")
    : (process.env.SHOT_SITE ?? "http://localhost:3000"));
const API = process.env.SHOT_API ?? "http://localhost:4000";
const value = (name, fallback) =>
  Number(flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);

const text = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1];

const mobile = flag("mobile");
const theme = text("theme");
if (theme && !["light", "dark", "system"].includes(theme)) {
  console.error("--theme must be light, dark or system");
  process.exit(1);
}
const browser = await chromium.launch({
  // Software GL so WebGL canvases render without a GPU.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: mobile
    ? { width: 390, height: value("height", 844) }
    : { width: 1440, height: value("height", 900) },
  deviceScaleFactor: value("dpr", mobile ? 2 : 1),
  colorScheme: text("os") === "dark" ? "dark" : "light",
});
// --ls=key=value sets a localStorage item before the page loads (repeatable).
const stored = flags.filter((f) => f.startsWith("--ls=")).map((f) => f.slice(5).split("="));
if (stored.length) {
  await page.addInitScript((items) => {
    try {
      for (const [key, value] of items) window.localStorage.setItem(key, value);
    } catch {}
  }, stored);
}
// --brand=<id> sets the Theme Lab's brand theme (aurora, voltage, marigold,
// jewel, mono, neon) the same way.
const brand = text("brand");
if (brand) {
  await page.context().addCookies([{ name: "cf-brand", value: brand, url: BASE }]);
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("cf-brand", value);
    } catch {}
  }, brand);
}
if (theme) {
  // Same key and cookie as packages/ui/design/theme-shared.ts.
  await page.context().addCookies([
    { name: "cf-theme", value: theme, url: BASE },
    ...(theme === "system" ? [] : [{ name: "cf-theme-mode", value: theme, url: BASE }]),
  ]);
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("cf-theme", value);
    } catch {}
  }, theme);
}
// App pages need a signed-in user: sign in as the demo account first. The
// session cookie belongs to the API's host, so it does not matter which of
// the two servers the page comes from. The site has no signed-in pages.
// Pass --anon to view an app page signed out (login, signup).
if (inApp && !flag("anon")) {
  const res = await page.context().request.post(`${API}/auth/login`, {
    data: { email: "demo@callflow.dev", password: "callflow-demo" },
  });
  if (!res.ok()) console.log(`WARNING: demo sign-in failed (${res.status()})`);
}
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));

await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(value("wait", 1200));

if (flag("full")) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out, fullPage: true });
} else {
  const y = value("y", 0);
  if (y) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: out });
}

if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
console.log(`saved ${out}`);
await browser.close();
