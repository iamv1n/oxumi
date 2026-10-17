"use client";

import { LockOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import styled from "styled-components";
import type { Guide } from "@/components/onboarding/OnboardingProvider";
import {
  type AgentSummary,
  type Credential,
  type Health,
  removeCredential,
  saveCredential,
  verifyCredential,
} from "@/lib/api";
import { type } from "@oxumi/ui/design/typography";
import { type Actions, type Need, usageOf } from "./model";
import { ProviderDrawer } from "./ProviderDrawer";
import { groupId, ProviderList } from "./ProviderList";
import { Readiness } from "./Readiness";

// The body of the integrations page: what the project can do with the keys it
// has, then every provider it can connect, grouped by what it is for. A
// provider opens in a panel at the side.

export const INTEGRATIONS_GUIDE: Guide = {
  id: "integrations",
  steps: [
    {
      target: '[data-tour="integrations-summary"]',
      title: "What your agents can do right now",
      description:
        "A text call needs one language model. A voice call in the browser needs a speech provider as well, and a phone call needs a telephony provider on top. Each line says whether it is ready and, if not, exactly what is still needed.",
    },
    {
      target: '[data-tour="integrations-llm"]',
      title: "Language models",
      description:
        "The AI that runs the conversation. Connect at least one provider with your own key; each key unlocks that provider's models for every agent in this project. Select a row to connect it.",
    },
    {
      target: '[data-tour="integrations-speech"]',
      title: "Speech",
      description:
        "Lets agents listen and talk. Connect one to make voice calls, and set a default voice so agents do not each need their own.",
    },
    {
      target: '[data-tour="integrations-telephony"]',
      title: "Telephony",
      description:
        "Connect Twilio, Exotel or Vobiz to let agents ring real phone numbers. Each needs a token, an account ID and a number you own; Exotel also has a short one-time setup, shown when you open it.",
      placement: "top",
    },
    {
      target: '[data-tour="integrations-notice"]',
      title: "Your keys stay yours",
      description:
        "A key is encrypted when you save it and never shown again, only its last four characters. Calls are billed by the provider to that key. Use Test at any time to check a key still works.",
    },
  ],
};

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

const Notice = styled.p`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  .anticon {
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

export function Integrations({
  projectId,
  credentials,
  health,
  agents,
  openProvider,
  onOpenProvider,
  actions,
}: {
  projectId: string;
  credentials: Credential[];
  health?: Health;
  agents?: AgentSummary[];
  // The provider whose panel is open, if any.
  openProvider: string | null;
  onOpenProvider: (provider: string | null) => void;
  // Stands in for the server in previews.
  actions?: Actions;
}) {
  const live = useMemo<Actions>(
    () => ({
      save: (provider, input) => saveCredential(projectId, provider, input),
      verify: (provider) => verifyCredential(projectId, provider),
      remove: (provider) => removeCredential(projectId, provider),
    }),
    [projectId],
  );
  const open = credentials.find((c) => c.provider === openProvider) ?? null;

  const follow = (need: Need) => {
    if (need.provider) onOpenProvider(need.provider);
    else if (need.kind) {
      const group = document.getElementById(groupId(need.kind));
      group?.scrollIntoView({ block: "start", behavior: "smooth" });
      group?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    }
  };

  return (
    <Stack>
      <Readiness projectId={projectId} credentials={credentials} health={health} onOpen={follow} />
      <ProviderList
        credentials={credentials}
        agents={agents}
        health={health}
        openProvider={openProvider}
        onOpen={onOpenProvider}
      />
      <Notice data-tour="integrations-notice">
        <LockOutlined aria-hidden />
        <span>
          Keys are encrypted and never shown again after saving. Calls made by this project&apos;s
          agents are billed by the provider to the key saved here.
        </span>
      </Notice>
      <ProviderDrawer
        credential={open}
        usage={open ? usageOf(open, agents, health) : null}
        health={health}
        actions={actions ?? live}
        onClose={() => onOpenProvider(null)}
      />
    </Stack>
  );
}
