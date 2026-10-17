import type { NextRequest } from "next/server";
import { INTERNAL_PAGES } from "@oxumi/ui/design/theme-shared";
import { colorwayById } from "@oxumi/ui/brand/kit/colorways";
import { DESIGNS, renderDesign, type DesignId } from "@oxumi/ui/brand/kit/compose";
import { KIT_ZIP, kitFiles } from "@/components/brand/kit/manifest";
import { renderSocial, SOCIAL_FORMATS, SOCIAL_STYLES, type SocialStyle } from "@/components/brand/kit/socialFormats";

// Any brand-kit drawing as a standalone SVG, from the same code the /brand
// page uses. scripts/build-brand-kit.mjs builds public/brand from this.
//   /brand/asset?manifest=1
//   /brand/asset?kind=design&id=lockup&colorway=blue-navy&px=1024
//   /brand/asset?kind=social&id=x-header&style=glow&headline=1&colorway=blue-navy
// A banner with a headline names the display serif but does not carry it;
// the build script embeds the font before rasterising.
export function GET(request: NextRequest) {
  // Part of the brand kit, which is internal until it is published.
  if (!INTERNAL_PAGES) return new Response(null, { status: 404 });
  const query = request.nextUrl.searchParams;
  if (query.has("manifest")) return Response.json({ zip: KIT_ZIP, files: kitFiles });

  const cw = colorwayById(query.get("colorway") ?? "");
  const id = query.get("id") ?? "";
  let svg: string | undefined;
  if (query.get("kind") === "social") {
    const format = SOCIAL_FORMATS.find((item) => item.id === id);
    const style = SOCIAL_STYLES.find((item) => item.id === query.get("style"))?.id ?? ("glow" satisfies SocialStyle);
    if (format) svg = renderSocial(format, style, cw, { headline: query.get("headline") === "1" }).svg;
  } else if (DESIGNS.some((item) => item.id === id)) {
    svg = renderDesign(id as DesignId, cw, {
      px: Number(query.get("px")) || undefined,
      bleed: query.get("bleed") === "1",
      square: query.get("square") === "1",
    }).svg;
  }
  if (!svg) return new Response("Unknown asset", { status: 404 });
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
}
