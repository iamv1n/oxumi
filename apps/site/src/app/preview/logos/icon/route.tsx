import type { NextRequest } from "next/server";
import { conceptById } from "@oxumi/ui/brand/concepts";
import type { ConceptId } from "@oxumi/ui/brand/concepts";
import { iconResponse } from "@oxumi/ui/brand/icon";
import { INTERNAL_PAGES } from "@oxumi/ui/design/theme-shared";

// The real icon PNG for any concept, for the comparison page:
// /preview/logos/icon?concept=tide&size=32&tile=1
export function GET(request: NextRequest) {
  if (!INTERNAL_PAGES) return new Response(null, { status: 404 });
  const query = request.nextUrl.searchParams;
  const concept = conceptById[query.get("concept") as ConceptId] ?? conceptById.tide;
  const size = Math.min(512, Math.max(16, Number(query.get("size")) || 32));
  return iconResponse(size, { tile: query.get("tile") === "1", concept });
}
