import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import ThemeSeed from "@oxumi/ui/design/ThemeSeed";

export const metadata = { title: "Sign in · Oxumi" };

export default function Page() {
  return (
    <ThemeSeed>
      <Suspense>
        <LoginForm />
      </Suspense>
    </ThemeSeed>
  );
}
