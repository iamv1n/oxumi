import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { INTERNAL_PAGES } from "@oxumi/ui/design/theme-shared";

// Everything under /preview is a workbench for the team.
export default function PreviewLayout({ children }: { children: ReactNode }) {
  if (!INTERNAL_PAGES) notFound();
  return children;
}
