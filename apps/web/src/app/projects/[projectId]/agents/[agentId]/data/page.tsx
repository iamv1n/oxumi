"use client";

import { useParams } from "next/navigation";
import { DataEditor } from "@/components/app/agents/DataEditor";
import { LoadError, PageSkeleton } from "@/components/app/agents/states";
import { Page, PageHeader } from "@/components/app/kit";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { useAgent } from "@/lib/api";

const GUIDE: Guide = {
  id: "agent-data",
  steps: [
    {
      target: '[data-tour="data-variables"]',
      title: "Variables: what you already know",
      description:
        "Details you have before the call starts, such as the person's name or their route. You give a value for each call, and the agent can say it.",
    },
    {
      target: '[data-tour="data-fields"]',
      title: "Fields: what the call must find out",
      description:
        "The answers you want back from every call, such as where the driver is or whether they are on time. These become the result of the call.",
    },
    {
      target: '[data-tour="data-type"]',
      title: "Pick the kind of answer",
      description:
        "Text keeps the person's own words. Number and Yes / No keep answers tidy. Choice limits the answer to a list you write.",
    },
    {
      target: '[data-tour="data-usage"]',
      title: "Where each one is used",
      description:
        "Shows how many steps of the flow use this item. Click it to see which ones. You are warned before removing anything the flow still needs.",
      placement: "left",
    },
    {
      target: '[data-tour="save-bar"]',
      title: "Save or reset",
      description: "Changes here only reach the agent once you save them.",
      placement: "top",
    },
  ],
};

export default function AgentDataPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = useAgent(agentId);
  usePageGuide(GUIDE);

  return (
    <Page>
      {agent.data ? (
        <>
          <PageHeader
            title="Data"
            description="What the agent knows going into a call, and what it must come back with."
          />
          <DataEditor agent={agent.data} />
        </>
      ) : agent.error ? (
        <LoadError
          title="Variables and fields could not be loaded"
          error={agent.error}
          onRetry={() => agent.mutate()}
        />
      ) : (
        <PageSkeleton panels={2} rows={4} />
      )}
    </Page>
  );
}
