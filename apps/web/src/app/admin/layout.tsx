import type { ReactNode } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import AuthGate from "@/components/auth/AuthGate";

// The operator console. Needs a signed-in admin; the API checks this too.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminFrame>{children}</AdminFrame>
    </AuthGate>
  );
}
