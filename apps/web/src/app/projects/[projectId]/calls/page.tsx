"use client";

import { useParams } from "next/navigation";
import { CallsTable } from "@/components/app/calls/CallsTable";
import { Page, PageHeader } from "@/components/app/kit";

export default function ProjectCallsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <Page>
      <PageHeader
        title="Calls"
        description="Every call made by this project's agents, newest first. Open one for its transcript and answers."
      />
      <CallsTable projectId={projectId} />
    </Page>
  );
}
