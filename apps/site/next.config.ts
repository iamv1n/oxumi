import type { NextConfig } from "next";
import { APP_URL, EARLY_ACCESS } from "./src/lib/app-url";

// The app (apps/web) used to be served from this origin. Its addresses still
// arrive here from old links and bookmarks, so they are sent on to the app,
// or to the early-access notice when this build has no app to send them to
// (no NEXT_PUBLIC_APP_URL; see src/lib/app-url.ts).
const APP_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/account",
  "/projects",
  "/projects/:path*",
];

const nextConfig: NextConfig = {
  compiler: { styledComponents: true },
  // @oxumi/ui is TypeScript source, compiled as part of this app.
  transpilePackages: ["@oxumi/ui"],
  redirects: async () =>
    APP_ROUTES.map((source) => ({
      source,
      destination: APP_URL ? `${APP_URL}${source}` : EARLY_ACCESS,
      permanent: false,
    })),
};

export default nextConfig;
