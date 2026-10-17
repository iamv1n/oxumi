import { Suspense } from "react";
import ForgotForm from "@/components/auth/ForgotForm";
import ThemeSeed from "@oxumi/ui/design/ThemeSeed";

export const metadata = { title: "Forgot password · Oxumi" };

export default function Page() {
  return (
    <ThemeSeed>
      <Suspense>
        <ForgotForm />
      </Suspense>
    </ThemeSeed>
  );
}
