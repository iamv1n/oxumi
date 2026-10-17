import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

// Everything under /projects needs a signed-in user, and gets guided
// onboarding on first visit.
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OnboardingProvider>{children}</OnboardingProvider>
    </AuthGate>
  );
}
