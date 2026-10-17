import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

// Account pages need a signed-in user.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OnboardingProvider>{children}</OnboardingProvider>
    </AuthGate>
  );
}
