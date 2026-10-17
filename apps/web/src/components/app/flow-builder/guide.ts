import type { Guide } from "@/components/onboarding/OnboardingProvider";

// The builder's guided tour. Targets are data-tour attributes set by the
// builder; a step whose target is not on screen is skipped by the provider.
export const BUILDER_GUIDE: Guide = {
  id: "flow-builder",
  steps: [
    {
      target: '[data-tour="builder-palette"]',
      title: "Steps you can add",
      description:
        "A call is built from steps: say a line, ask a question, branch on an answer, pass the caller to a person, or end the call. Drag a step onto the canvas, or click it to add it in the middle.",
      placement: "right",
    },
    {
      target: '[data-tour="builder-output"]',
      title: "Connect one step to the next",
      description:
        "The canvas shows the call from left to right. Drag from this dot on a step's right edge to another step to say what happens next. Click an arrow and press Delete to remove it.",
      placement: "right",
    },
    {
      target: '[data-tour="builder-branch"]',
      title: "Branch: one path per answer",
      description:
        "A Branch step looks at an answer the agent has collected and sends the call down a different path for each case, with an “otherwise” path for everything else.",
      placement: "right",
    },
    {
      target: '[data-tour="builder-inspector"]',
      title: "Edit a step",
      description:
        "Click a step to edit what it says or collects here. With nothing selected, this panel lists anything in the flow that still needs fixing.",
      placement: "left",
    },
    {
      target: '[data-tour="builder-save"]',
      title: "Saved as you go",
      description:
        "Changes save by themselves a moment after you stop editing. Undo and redo are next to it if you change your mind.",
      placement: "bottom",
    },
    {
      target: '[data-tour="builder-ready"]',
      title: "Is it ready?",
      description:
        "When this says Ready, the agent can take calls. Otherwise it counts what is left to fix: click it to see the list.",
      placement: "bottomRight",
    },
    {
      target: '[data-tour="builder-test"]',
      title: "Try it out",
      description:
        "Run a test call in your browser to hear the flow before any real call is made.",
      placement: "bottomRight",
    },
  ],
};
