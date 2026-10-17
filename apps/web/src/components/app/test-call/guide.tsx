import type { Guide } from "@/components/onboarding/OnboardingProvider";

// The Test tab's guided highlights. Targets are data-tour attributes in this
// folder; a step whose target is not on screen (a collapsed panel) is skipped.
export const TEST_GUIDE: Guide = {
  id: "agent-test",
  steps: [
    {
      target: '[data-tour="test-variables"]',
      title: "Details the agent knows before the call",
      description:
        "Who it is calling and why. They start as example values; change them to try the call with a different person or situation.",
      placement: "right",
    },
    {
      target: '[data-tour="test-model"]',
      title: "Which AI model runs the call",
      description:
        "Leave it on the agent\u2019s own model, or pick another just for this test to compare how they behave and how fast they answer.",
      placement: "right",
    },
    {
      target: '[data-tour="test-start"]',
      title: "Start a call: you play the person being called",
      description:
        "Use voice to talk through your microphone, or text to type your answers. Nobody is dialled for these two.",
      placement: "rightBottom",
    },
    {
      target: '[data-tour="test-phone"]',
      title: "Or call a real phone",
      description:
        "Give a number and the agent phones it for real. Use it once the browser test goes well: the call is billed and the person who answers hears your agent.",
      placement: "rightBottom",
    },
    {
      target: '[data-tour="test-conversation"]',
      title: "The conversation",
      description:
        "What the agent says and what you answer appears here as it happens, in Hindi or English. Interrupt it or go off-script to see how it copes.",
      placement: "left",
    },
    {
      target: '[data-tour="test-flow"]',
      title: "Where the call is in your flow",
      description:
        "The steps of the flow in order. The highlighted one is where the agent is right now; ticks mark the steps it has finished.",
      placement: "left",
    },
    {
      target: '[data-tour="test-fields"]',
      title: "Answers, as they are captured",
      description: "Answers appear here the moment they\u2019re captured. A dash means not yet.",
      placement: "left",
    },
    {
      target: '[data-tour="test-latency"]',
      title: "How fast the agent responds",
      description:
        "After each of your answers: how long until the agent\u2019s first words appear, and until you first hear it.",
      placement: "leftBottom",
    },
  ],
};
