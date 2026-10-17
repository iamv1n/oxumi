import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/shell/AppShell";

// Kept in step with SIDEBAR_COOKIE in the (client-only) Sidebar module.
const SIDEBAR_COOKIE = "oxumi_sidebar";

// The app shell around every page of a project.
export default async function ProjectLayout({ children }: { children: ReactNode }) {
  // Read here so a collapsed sidebar is collapsed in the server's HTML too.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  return <AppShell sidebarCollapsed={collapsed}>{children}</AppShell>;
}
