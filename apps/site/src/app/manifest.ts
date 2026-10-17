import type { MetadataRoute } from "next";
import { logoColor } from "@oxumi/ui/design/logo";

// The web app manifest: name and home-screen icons. The icons are brand-kit
// files written by scripts/build-brand-kit.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oxumi",
    short_name: "Oxumi",
    description: "Design a call flow, then let a voice agent run it",
    start_url: "/",
    display: "standalone",
    background_color: logoColor.tile,
    theme_color: logoColor.tile,
    icons: [
      { src: "/brand/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icons/app-icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
    ],
  };
}
