import { Suspense } from "react";
import SignupForm from "@/components/auth/SignupForm";
import ThemeSeed from "@oxumi/ui/design/ThemeSeed";

export const metadata = { title: "Create account · Oxumi" };

export default function Page() {
  return (
    <ThemeSeed>
      <Suspense>
        <SignupForm />
      </Suspense>
    </ThemeSeed>
  );
}
