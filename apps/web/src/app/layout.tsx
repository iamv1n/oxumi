import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Noto_Sans_Devanagari,
} from "next/font/google";
import Providers from "@oxumi/ui/design/Providers";
import { themeScript } from "@oxumi/ui/design/theme-shared";
import { SITE_URL } from "@/lib/routes";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500"],
});

// The link-preview image is one of the brand kit's generated files, served by
// the public site (scripts/build-brand-kit.mjs writes it to
// apps/site/public/brand/og.png).
const preview = { url: "/brand/og.png", width: 1200, height: 630, alt: "Oxumi" };

export const metadata: Metadata = {
  // Makes the image URL absolute, on the site.
  metadataBase: new URL(SITE_URL || "http://localhost:3000"),
  title: "Oxumi",
  description: "Design a call flow, then let a voice agent run it",
  openGraph: { siteName: "Oxumi", type: "website", images: [preview] },
  twitter: { card: "summary_large_image", images: [preview] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${notoDevanagari.variable}`}
      // The script below sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Sets the light or dark theme before first paint, so the page never
            flashes the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
