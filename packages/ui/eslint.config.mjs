import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The same rules as the two apps that consume this package.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // This is not a Next.js app, so there is no pages directory to check links against.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);
