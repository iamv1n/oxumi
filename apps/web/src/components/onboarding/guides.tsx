import type { Guide } from "./OnboardingProvider";

// Guides for the pages that frame the app. Pages owned by a feature keep
// their guide next to the page.

export const PROJECTS_GUIDE: Guide = {
  id: "projects",
  autoStart: true,
  steps: [
    {
      title: "Welcome to Oxumi",
      description:
        "Here is how the app is organised: a project holds your agents, an agent holds one call flow, and every call it makes is recorded with its answers. This takes under a minute.",
    },
    {
      target: '[data-tour="new-project"]',
      title: "Start a project",
      description:
        "Create one project per team or use case, for example “Clinic reminders” or “Fleet check-ins”. Agents and call history stay separate between projects.",
    },
    {
      target: '[data-tour="project-list"]',
      title: "Your projects",
      description:
        "Each card shows how many agents and calls a project has. Open one to work inside it.",
    },
    {
      target: '[data-tour="user-menu"]',
      title: "Your account",
      description: "Your name and email, and where you sign out.",
      placement: "bottomRight",
    },
    {
      target: '[data-tour="guide-button"]',
      title: "Replay this any time",
      description:
        "Every page has a short guide like this one. Press this button whenever you want to see it again.",
      placement: "bottomRight",
    },
  ],
};

export const OVERVIEW_GUIDE: Guide = {
  id: "project-overview",
  steps: [
    {
      target: '[data-tour="project-switcher"]',
      title: "Switch projects",
      description:
        "You are inside one project. Use this to jump to another, see all projects, or create a new one.",
      placement: "bottomLeft",
    },
    {
      target: '[data-tour="nav-agents"]',
      title: "Agents",
      description:
        "An agent is one kind of call: its flow, how it sounds, and which AI model runs it. Create and design them here.",
      placement: "right",
    },
    {
      target: '[data-tour="nav-calls"]',
      title: "Calls",
      description:
        "Every call your agents make, with its transcript, the answers collected and how quickly the agent responded.",
      placement: "right",
    },
    {
      target: '[data-tour="overview-stats"]',
      title: "How the project is doing",
      description:
        "Agents ready to take calls, calls made, how many completed, and the typical wait before the agent starts speaking.",
    },
    {
      target: '[data-tour="nav-settings"]',
      title: "Settings",
      description:
        "Rename or delete the project, and see which AI models are available to your agents.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-toggle"]',
      title: "Make room",
      description:
        "Collapse the sidebar to a strip of icons when you want more space, for example in the flow builder. Press it again, or Cmd/Ctrl+B, to bring the labels back.",
      placement: "right",
    },
  ],
};

export const SETTINGS_GUIDE: Guide = {
  id: "project-settings",
  steps: [
    {
      target: '[data-tour="settings-general"]',
      title: "Name and description",
      description:
        "Rename the project or change its description. Nothing is saved until you press Save changes. Click a section's heading to fold it away; the page remembers which ones you keep open.",
    },
    {
      target: '[data-tour="settings-models"]',
      title: "Models your agents can use",
      description:
        "“Available” means a key for that provider is connected to this project, so its agents can run calls on those models. Providers marked “Not connected” need a key, which you add under Integrations. This list is read-only.",
    },
    {
      target: '[data-tour="settings-danger"]',
      title: "Danger zone",
      description:
        "Deleting a project removes its agents, flows and call history for good. You are asked to type the project's name first, so it cannot happen by accident.",
      placement: "top",
    },
  ],
};
