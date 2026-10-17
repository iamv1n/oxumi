"use client";

import { useParams } from "next/navigation";
import { CallsTable } from "@/components/app/calls/CallsTable";
import { Page, PageHeader } from "@/components/app/kit";

export default function AgentCallsPage() {
  const { projectId, agentId } = useParams<{ projectId: string; agentId: string }>();
  return (
    <Page>
      <PageHeader
        title="Calls"
        description="Every call this agent has made, newest first. Open one for its transcript and answers."
      />
      <CallsTable projectId={projectId} agentId={agentId} />
    </Page>
  );
}
