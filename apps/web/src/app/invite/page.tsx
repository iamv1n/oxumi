import { Suspense } from "react";
import { InviteView } from "@/components/app/team/InviteView";
import ThemeSeed from "@oxumi/ui/design/ThemeSeed";

export const metadata = { title: "Invitation · Oxumi" };

// Opened from an invitation email. Not behind the sign-in gate: someone who
// is signed out sees what the invitation is for and is sent to sign in.
export default function Page() {
  return (
    <ThemeSeed>
      <Suspense>
        <InviteView />
      </Suspense>
    </ThemeSeed>
  );
}
