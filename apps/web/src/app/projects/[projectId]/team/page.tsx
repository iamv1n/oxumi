"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { Page, PageHeader } from "@/components/app/kit";
import { ActivityLog } from "@/components/app/team/ActivityLog";
import { InviteModal } from "@/components/app/team/InviteModal";
import { InvitesPanel } from "@/components/app/team/InvitesPanel";
import { MembersPanel } from "@/components/app/team/MembersPanel";
import { atLeast, useProject, useSession } from "@/lib/api";

const Sections = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
`;

// Who is in the project, who has been invited, and what they have changed.
export default function TeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { user } = useSession();
  const [inviting, setInviting] = useState(false);
  const role = project?.role;
  const isAdmin = atLeast(role, "admin");

  return (
    <Page>
      <PageHeader
        title="Team"
        description={
          isAdmin
            ? "Invite people to this project and choose what each of them can do."
            : "The people in this project, and what has changed in it."
        }
      />
      <Sections>
        <MembersPanel
          projectId={projectId}
          projectName={project?.name ?? "this project"}
          myRole={role}
          myId={user?.id}
          onInvite={isAdmin ? () => setInviting(true) : undefined}
        />
        {isAdmin && <InvitesPanel projectId={projectId} myRole={role} />}
        <ActivityLog projectId={projectId} />
      </Sections>
      {isAdmin && (
        <InviteModal
          projectId={projectId}
          myRole={role}
          open={inviting}
          onClose={() => setInviting(false)}
        />
      )}
    </Page>
  );
}
