import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  compiler: { styledComponents: true },
  // @oxumi/ui is TypeScript source, compiled as part of this app.
  transpilePackages: ["@oxumi/ui"],
  // The app has no page of its own at "/": it opens on the projects list,
  // which sends signed-out visitors to /login (components/auth/AuthGate.tsx).
  redirects: async () => [{ source: "/", destination: "/projects", permanent: false }],
};

// The public site (apps/site) is a separate deployment, and the app links to
// it for the home page, the docs, terms and privacy (src/lib/routes.ts).
export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      "NEXT_PUBLIC_SITE_URL is not set: the app's links to the site (home, docs, terms, privacy) will not work in this build.",
    );
  }
  return nextConfig;
}
