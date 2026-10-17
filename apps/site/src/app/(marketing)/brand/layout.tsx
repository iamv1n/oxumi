import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { INTERNAL_PAGES } from "@oxumi/ui/design/theme-shared";

// The brand kit is for the team until it is ready to publish.
export default function BrandLayout({ children }: { children: ReactNode }) {
  if (!INTERNAL_PAGES) notFound();
  return children;
}
