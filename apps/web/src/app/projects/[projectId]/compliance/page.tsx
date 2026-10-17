"use client";

import { Skeleton } from "antd";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { CheckNumberSection } from "@/components/app/compliance/CheckNumberSection";
import { ConsentSection } from "@/components/app/compliance/ConsentSection";
import { DoNotCallSection } from "@/components/app/compliance/DoNotCallSection";
import { RulesSection } from "@/components/app/compliance/RulesSection";
import { Page, PageHeader, Panel } from "@/components/app/kit";
import { atLeast, useCompliance, useProject } from "@/lib/api";

// The rules every phone call is checked against before it is placed, and the
// lists behind them.

const Sections = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

export default function CompliancePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const compliance = useCompliance(projectId);
  const role = project.data?.role;

  return (
    <Page>
      <PageHeader
        title="Compliance"
        description="When your agents may call, what they say first, and who they must not call. Phone calls that break these rules are not placed."
      />
      {compliance.data ? (
        <Sections>
          <RulesSection
            projectId={projectId}
            rules={compliance.data}
            canEdit={atLeast(role, "admin")}
          />
          <CheckNumberSection projectId={projectId} />
          <DoNotCallSection
            projectId={projectId}
            canAdd={atLeast(role, "editor")}
            canRemove={atLeast(role, "admin")}
          />
          <ConsentSection
            projectId={projectId}
            canRecord={atLeast(role, "editor")}
            required={compliance.data.requireConsent}
          />
        </Sections>
      ) : compliance.error ? (
        <LoadError
          title={
            compliance.error.status === 403
              ? "You cannot see this project's compliance settings"
              : "Compliance settings could not be loaded"
          }
          error={compliance.error}
          onRetry={() => void compliance.mutate()}
        />
      ) : (
        <Sections aria-busy aria-label="Loading compliance settings">
          {[6, 2, 4, 3].map((rows, index) => (
            <Panel key={index}>
              <Skeleton active title={false} paragraph={{ rows }} />
            </Panel>
          ))}
        </Sections>
      )}
    </Page>
  );
}
