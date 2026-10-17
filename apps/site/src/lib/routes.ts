import { appHref, EARLY_ACCESS } from "./app-url";

// The site's own pages that other code links to by name, and the pages of the
// app (apps/web, a separate deployment) that the site links to.
export const routes = {
  home: "/",
  terms: "/terms",
  privacy: "/privacy",
  earlyAccess: EARLY_ACCESS,
  // In the app. These lead to /early-access when there is no app (see
  // ./app-url.ts).
  login: appHref("/login"),
  signup: appHref("/signup"),
  projects: appHref("/projects"),
} as const;
