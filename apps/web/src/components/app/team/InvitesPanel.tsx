"use client";

import { App, Button, Table, type TableColumnsType } from "antd";
import { useMemo } from "react";
import { LoadError } from "@/components/app/agents/states";
import { type Invite, type ProjectRole, revokeInvite, useInvites } from "@/lib/api";
import { assignableRoles, ROLE } from "./roles";
import { SectionHead, TableBox, When } from "./ui";

// Invitations not yet accepted. Admins and the owner only.
export function InvitesPanel({
  projectId,
  myRole,
}: {
  projectId: string;
  myRole: ProjectRole | undefined;
}) {
  const { message, modal } = App.useApp();
  const invites = useInvites(projectId, true);
  // Admins can withdraw invitations for roles they could hand out themselves.
  const revocable = useMemo(() => new Set<string>(assignableRoles(myRole)), [myRole]);

  const revoke = (invite: Invite) => {
    modal.confirm({
      title: `Revoke the invitation to ${invite.email}?`,
      content: "The link in their email stops working. You can invite them again later.",
      okText: "Revoke",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await revokeInvite(projectId, invite.id);
          message.success(`Revoked the invitation to ${invite.email}`);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not revoke the invitation.");
        }
      },
    });
  };

  const columns: TableColumnsType<Invite> = [
    { title: "Email", dataIndex: "email" },
    { title: "Role", dataIndex: "role", render: (role: Invite["role"]) => ROLE[role].label },
    { title: "Sent", dataIndex: "createdAt", render: (iso: string) => <When iso={iso} /> },
    { title: "Expires", dataIndex: "expiresAt", render: (iso: string) => <When iso={iso} /> },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, invite) =>
        revocable.has(invite.role) ? (
          <Button size="small" danger type="text" onClick={() => revoke(invite)}>
            Revoke
          </Button>
        ) : null,
    },
  ];

  // Shown only once there is something pending (or it failed to load), so the
  // page does not jump when the list turns out empty.
  if (!invites.error && (!invites.data || invites.data.length === 0)) return null;

  return (
    <section aria-labelledby="team-invites">
      <SectionHead>
        <h2 id="team-invites">Pending invitations</h2>
        <p>Links last 7 days.</p>
      </SectionHead>
      {invites.error && !invites.data ? (
        <LoadError
          title="Invitations could not be loaded"
          error={invites.error}
          onRetry={() => void invites.mutate()}
        />
      ) : (
        <TableBox $padded={false}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={invites.data ?? []}
            scroll={{ x: "max-content" }}
            pagination={false}
          />
        </TableBox>
      )}
    </section>
  );
}
