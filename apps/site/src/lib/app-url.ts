// The product app (sign in, sign up, projects) is a separate deployment:
// apps/web. This is where it lives.
//
//   NEXT_PUBLIC_APP_URL   the app's address, e.g. https://app.example.com
//
// In development it defaults to the app's dev server. A production build
// without it has no app to send people to, so every link to the app leads to
// the site's own /early-access page instead.
//
// next.config.ts imports this file too (for the redirects from the app's old
// addresses), so it must not import anything itself.
const configured =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3100");

export const APP_URL: string | null = configured ? configured.replace(/\/+$/, "") : null;

export const EARLY_ACCESS = "/early-access";

// The address of a page in the app, given its path there.
export const appHref = (path: `/${string}`): string =>
  APP_URL ? `${APP_URL}${path}` : EARLY_ACCESS;
