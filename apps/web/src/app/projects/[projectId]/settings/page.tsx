"use client";

import { Skeleton } from "antd";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Page, PageHeader, Panel } from "@/components/app/kit";
import { LinkButton } from "@/components/app/projects/LinkButton";
import { LoadError } from "@/components/app/projects/LoadError";
import {
  DangerZone,
  GeneralSettings,
  ModelsSettings,
} from "@/components/app/projects/SettingsPanels";
import { SETTINGS_GUIDE } from "@/components/onboarding/guides";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { useProject } from "@/lib/api";
import { routes } from "@/lib/routes";

const Sections = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 860px;
`;

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, error, mutate } = useProject(projectId);
  usePageGuide(SETTINGS_GUIDE);

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Project details, the models its agents can use, and deletion."
      />
      <Sections>
        {error && !project ? (
          <LoadError
            error={error}
            what={
              error.status === 404
                ? "It may have been deleted, or it belongs to a different account."
                : "this project"
            }
            title={error.status === 404 ? "Project not found" : undefined}
            onRetry={error.status === 404 ? undefined : () => void mutate()}
            action={<LinkButton href={routes.projects}>All projects</LinkButton>}
          />
        ) : project ? (
          <GeneralSettings project={project} />
        ) : (
          <Panel aria-busy aria-label="Loading project">
            <Skeleton active paragraph={{ rows: 3 }} />
          </Panel>
        )}
        <ModelsSettings projectId={projectId} />
        {project && <DangerZone project={project} />}
      </Sections>
    </Page>
  );
}
