import { Suspense } from "react";
import ResetForm from "@/components/auth/ResetForm";
import ThemeSeed from "@oxumi/ui/design/ThemeSeed";

export const metadata = { title: "Reset password · Oxumi" };

export default function Page() {
  return (
    <ThemeSeed>
      <Suspense>
        <ResetForm />
      </Suspense>
    </ThemeSeed>
  );
}
