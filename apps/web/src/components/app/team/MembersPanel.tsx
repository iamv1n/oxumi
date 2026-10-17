"use client";

import { LogoutOutlined, UserAddOutlined } from "@ant-design/icons";
import { App, Button, Select, Table, type TableColumnsType, Tag } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { LoadError, TableSkeleton } from "@/components/app/agents/states";
import {
  type Invite,
  type Member,
  type ProjectRole,
  removeMember,
  setMemberRole,
  useMembers,
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { assignableRoles, canManage, ROLE } from "./roles";
import { Person, SectionHead, TableBox, When } from "./ui";

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(1)};
`;

const You = styled(Tag)`
  margin-inline-start: ${({ theme }) => theme.space(2)};
`;

export function MembersPanel({
  projectId,
  projectName,
  myRole,
  myId,
  onInvite,
}: {
  projectId: string;
  projectName: string;
  myRole: ProjectRole | undefined;
  myId: string | undefined;
  onInvite?: () => void;
}) {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const members = useMembers(projectId);
  // The member whose role is being saved, so only that select spins.
  const [saving, setSaving] = useState<string | null>(null);
  const options = assignableRoles(myRole).map((role) => ({
    value: role,
    label: ROLE[role].label,
  }));

  const changeRole = async (member: Member, role: Invite["role"]) => {
    setSaving(member.userId);
    try {
      await setMemberRole(projectId, member.userId, role);
      message.success(`${member.name || member.email} is now ${ROLE[role].label.toLowerCase()}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not change the role.");
    } finally {
      setSaving(null);
    }
  };

  const remove = (member: Member) => {
    modal.confirm({
      title: `Remove ${member.name || member.email}?`,
      content: `They lose access to ${projectName} at once. You can invite them again later.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Keep them",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await removeMember(projectId, member.userId);
          message.success(`Removed ${member.name || member.email}`);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not remove them.");
        }
      },
    });
  };

  const leave = () => {
    if (!myId) return;
    modal.confirm({
      title: `Leave ${projectName}?`,
      content: "You lose access to this project at once. Someone will need to invite you again.",
      okText: "Leave project",
      okButtonProps: { danger: true },
      cancelText: "Stay",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await removeMember(projectId, myId);
          message.success(`You left ${projectName}`);
          router.push(routes.projects);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not leave the project.");
        }
      },
    });
  };

  const columns: TableColumnsType<Member> = [
    {
      title: "Member",
      key: "member",
      render: (_, member) => (
        <Person>
          <span className="name">
            {member.name || member.email}
            {member.userId === myId && <You variant="filled">You</You>}
          </span>
          {member.name && <small>{member.email}</small>}
        </Person>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: ProjectRole, member) =>
        canManage(myRole, member, myId) ? (
          <Select<Invite["role"]>
            size="small"
            value={role as Invite["role"]}
            options={options}
            loading={saving === member.userId}
            disabled={saving === member.userId}
            onChange={(next) => void changeRole(member, next)}
            aria-label={`Role for ${member.name || member.email}`}
            style={{ minWidth: 110 }}
            popupMatchSelectWidth={false}
          />
        ) : (
          ROLE[role].label
        ),
    },
    {
      title: "Joined",
      dataIndex: "joinedAt",
      render: (iso: string) => <When iso={iso} />,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, member) => {
        if (member.userId === myId && member.role !== "owner")
          return (
            <Actions>
              <Button size="small" icon={<LogoutOutlined />} onClick={leave}>
                Leave project
              </Button>
            </Actions>
          );
        if (canManage(myRole, member, myId))
          return (
            <Actions>
              <Button size="small" danger type="text" onClick={() => remove(member)}>
                Remove
              </Button>
            </Actions>
          );
        return null;
      },
    },
  ];

  const count = members.data?.length;

  return (
    <section aria-labelledby="team-members">
      <SectionHead>
        <h2 id="team-members">Members</h2>
        {count !== undefined && <p>{count === 1 ? "1 person" : `${count} people`}</p>}
        {onInvite && (
          <div className="actions">
            <Button type="primary" icon={<UserAddOutlined />} onClick={onInvite}>
              Invite
            </Button>
          </div>
        )}
      </SectionHead>
      {members.error && !members.data ? (
        <LoadError
          title="Members could not be loaded"
          error={members.error}
          onRetry={() => void members.mutate()}
        />
      ) : !members.data ? (
        <TableSkeleton rows={3} />
      ) : (
        <TableBox $padded={false}>
          <Table
            rowKey="userId"
            columns={columns}
            dataSource={members.data}
            scroll={{ x: "max-content" }}
            pagination={false}
          />
        </TableBox>
      )}
    </section>
  );
}
