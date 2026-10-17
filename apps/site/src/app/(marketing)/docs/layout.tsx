import type { Metadata } from "next";
import type { ReactNode } from "react";
import DocsShell from "@/components/docs/Shell";

export const metadata: Metadata = {
  title: { default: "API docs · Oxumi", template: "%s · Oxumi API docs" },
  description:
    "Reference and guides for the Oxumi API: place phone calls with your agents and receive the results by webhook.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
