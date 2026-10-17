import type { Guide } from "@/components/onboarding/OnboardingProvider";

// Shown only when the user presses the Guide button in the top bar.
export const ACCOUNT_GUIDE: Guide = {
  id: "account",
  steps: [
    {
      target: '[data-tour="account-nav"]',
      title: "Your account, in sections",
      description:
        "Everything about your own sign-in lives here, separate from any project. Jump to a section from this list; click a section's heading to fold it away.",
    },
    {
      target: '[data-tour="account-profile"]',
      title: "Profile",
      description:
        "Your name and company, as shown in the account menu. Nothing is saved until you press Save changes.",
    },
    {
      target: '[data-tour="account-email"]',
      title: "Email and password",
      description:
        "Changing either asks for your current password first. Changing the password also signs you out on every other device.",
    },
    {
      target: '[data-tour="account-danger"]',
      title: "Danger zone",
      description:
        "Deleting your account removes it for good, with every project, agent, call and API key. You confirm with your email and password, so it cannot happen by accident.",
      placement: "top",
    },
  ],
};
