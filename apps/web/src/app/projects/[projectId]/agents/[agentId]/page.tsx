"use client";

import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Spin } from "antd";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { FlowBuilder } from "@/components/app/flow-builder/FlowBuilder";
import { BUILDER_GUIDE } from "@/components/app/flow-builder/guide";
import { Empty } from "@/components/app/kit";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { useAgent } from "@/lib/api";

// The agent's "Flow" tab: the visual builder, filling the tab's whole area.

const Fill = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 640px;
  padding: ${({ theme }) => theme.space(6)};
`;

export default function AgentFlowPage() {
  const { projectId, agentId } = useParams<{ projectId: string; agentId: string }>();
  const agent = useAgent(agentId);
  // Replayed from the top bar's Guide button; it does not start by itself.
  usePageGuide(BUILDER_GUIDE);

  if (agent.data) {
    // Keyed by agent so switching agents starts from a clean editor.
    return <FlowBuilder key={agent.data.id} agent={agent.data} projectId={projectId} />;
  }
  if (agent.error) {
    return (
      <Fill>
        <Empty
          icon={<WarningOutlined />}
          title="The flow could not be loaded"
          description={agent.error.message}
          action={
            <Button icon={<ReloadOutlined />} onClick={() => agent.mutate()}>
              Try again
            </Button>
          }
        />
      </Fill>
    );
  }
  return (
    <Fill role="status" aria-label="Loading the flow">
      <Spin size="large" />
    </Fill>
  );
}
