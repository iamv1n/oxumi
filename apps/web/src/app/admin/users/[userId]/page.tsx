"use client";

import { ArrowLeftOutlined, LoginOutlined } from "@ant-design/icons";
import { App, Button, Descriptions, Popconfirm, Skeleton, Table, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { DailyBars } from "@/components/admin/DailyBars";
import { useImpersonate } from "@/components/admin/useImpersonate";
import {
  formatDateTime,
  formatDuration,
  Muted,
  OutcomeTag,
  PageHeader,
  Panel,
  PanelTitle,
  Stat,
} from "@/components/app/kit";
import { formatDate, formatRelative } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { type } from "@oxumi/ui/design/typography";
import { type AdminUserDetail, ApiError, setUserRole, useAdminUser, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";

const Back = styled(Link)`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};

  &:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Two = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const CHANNEL: Record<string, string> = {
  phone: "Phone",
  browser_voice: "Browser voice",
  browser_text: "Browser text",
  api_text: "API text",
};

const num = (n: number) => n.toLocaleString();

function Breakdown({ counts, label }: { counts: Record<string, number>; label: (key: string) => string }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <Muted>None yet</Muted>;
  return (
    <Tags>
      {entries.map(([key, n]) => (
        <Tag key={key} variant="filled">
          {label(key)} · {num(n)}
        </Tag>
      ))}
    </Tags>
  );
}

function Detail({ data }: { data: AdminUserDetail }) {
  const { user, usage } = data;
  const { user: me } = useSession();
  const { message } = App.useApp();
  const { start, pending } = useImpersonate();
  const [saving, setSaving] = useState(false);
  const isAdmin = user.role === "admin";
  const isMe = me?.id === user.id;

  const toggleRole = async () => {
    setSaving(true);
    try {
      await setUserRole(user.id, isAdmin ? "user" : "admin");
      message.success(isAdmin ? "Admin access removed." : "Made an admin.");
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not change the role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          <>
            {user.name || user.email} {isAdmin && <Tag color="gold">Admin</Tag>}
          </>
        }
        description={user.email}
        actions={
          !isMe && (
            <>
              <Popconfirm
                title={isAdmin ? "Remove admin access?" : "Make this user an admin?"}
                description={
                  isAdmin
                    ? "They'll lose the admin console at once."
                    : "They'll see every account and can sign in as any non-admin."
                }
                okText={isAdmin ? "Remove admin" : "Make admin"}
                okButtonProps={{ danger: isAdmin }}
                onConfirm={toggleRole}
              >
                <Button loading={saving}>{isAdmin ? "Remove admin" : "Make admin"}</Button>
              </Popconfirm>
              {!isAdmin && (
                <Popconfirm
                  title={`Sign in as ${user.email}?`}
                  description="You'll see the app exactly as they do, for up to an hour. Password and email changes stay blocked."
                  okText="Sign in as user"
                  onConfirm={() => start(user.id)}
                >
                  <Button type="primary" icon={<LoginOutlined />} loading={pending === user.id}>
                    Sign in as user
                  </Button>
                </Popconfirm>
              )}
            </>
          )
        }
      />

      <Stats>
        <Stat label="Calls" value={num(usage.calls)} hint={`${num(usage.calls30d)} in 30 days`} />
        <Stat
          label="Voice minutes"
          value={num(usage.phoneMinutes + usage.browserVoiceMinutes)}
          hint={`${num(usage.phoneMinutes)} phone · ${num(usage.browserVoiceMinutes)} browser`}
        />
        <Stat label="Agent turns" value={num(usage.turns)} hint="Replies across all calls" />
        <Stat
          label="API requests"
          value={num(usage.apiRequests30d)}
          hint={`${num(usage.apiErrors30d)} errors · ${num(usage.activeApiKeys)} active keys`}
        />
      </Stats>

      <Two>
        <DailyBars
          label="Calls, 30 days"
          days={usage.byDay.map((d) => ({ date: d.date, value: d.calls }))}
        />
        <DailyBars
          label="API requests, 30 days"
          days={usage.byDay.map((d) => ({ date: d.date, value: d.apiRequests }))}
        />
      </Two>

      <Stack>
        <Two style={{ marginBottom: 0 }}>
          <Panel>
            <PanelTitle>Profile</PanelTitle>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: "name", label: "Name", children: user.name || "—" },
                { key: "email", label: "Email", children: user.email },
                { key: "company", label: "Company", children: user.company || "—" },
                { key: "joined", label: "Joined", children: formatDate(user.createdAt) },
                {
                  key: "login",
                  label: "Last sign-in",
                  children: user.lastLoginAt ? formatRelative(user.lastLoginAt) : "Never recorded",
                },
                {
                  key: "terms",
                  label: "Accepted terms",
                  children: user.acceptedTermsAt ? formatDate(user.acceptedTermsAt) : "—",
                },
                { key: "id", label: "User ID", children: <Muted>{user.id}</Muted> },
              ]}
            />
          </Panel>
          <Panel>
            <PanelTitle>Calls by channel</PanelTitle>
            <Breakdown counts={usage.byChannel} label={(k) => CHANNEL[k] ?? k} />
            <PanelTitle style={{ marginTop: 20 }}>Outcomes</PanelTitle>
            <Breakdown counts={usage.byOutcome} label={(k) => k.replace(/_/g, " ")} />
            <PanelTitle style={{ marginTop: 20 }}>Active sessions</PanelTitle>
            {data.sessions.length ? (
              <Stack>
                {data.sessions.map((s) => (
                  <Muted key={s.id}>
                    Since {formatDateTime(s.createdAt)}, until {formatDateTime(s.expiresAt)}
                    {s.impersonator && ` · admin ${s.impersonator.email}`}
                  </Muted>
                ))}
              </Stack>
            ) : (
              <Muted>Not signed in anywhere</Muted>
            )}
          </Panel>
        </Two>

        <Panel $padded={false}>
          <PanelTitle style={{ padding: "16px 16px 0" }}>Projects they own</PanelTitle>
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            scroll={{ x: 760 }}
            dataSource={data.projects}
            locale={{ emptyText: "No projects" }}
            columns={[
              {
                title: "Project",
                dataIndex: "name",
                render: (name: string, row) =>
                  isAdmin || isMe ? (
                    name
                  ) : (
                    <Popconfirm
                      title={`Open "${name}" as ${user.email}?`}
                      okText="Open as user"
                      onConfirm={() => start(user.id, routes.project(row.id))}
                    >
                      <a>{name}</a>
                    </Popconfirm>
                  ),
              },
              { title: "Agents", dataIndex: "agentCount", align: "right" },
              { title: "Calls", dataIndex: "callCount", align: "right", render: num },
              { title: "API (30d)", dataIndex: "apiRequests30d", align: "right", render: num },
              {
                title: "Last call",
                dataIndex: "lastCallAt",
                render: (iso: string | null) => (iso ? formatRelative(iso) : <Muted>None</Muted>),
              },
              { title: "Created", dataIndex: "createdAt", render: formatDate },
            ]}
          />
        </Panel>

        {data.memberships.length > 0 && (
          <Panel $padded={false}>
            <PanelTitle style={{ padding: "16px 16px 0" }}>Member of</PanelTitle>
            <Table
              rowKey="id"
              size="middle"
              pagination={false}
              dataSource={data.memberships}
              columns={[
                { title: "Project", dataIndex: "name" },
                { title: "Role", dataIndex: "role", render: (role: string) => <Tag>{role}</Tag> },
                {
                  title: "Owner",
                  key: "owner",
                  render: (_, row) =>
                    row.owner ? (
                      <Link href={routes.adminUser(row.owner.id)}>{row.owner.email}</Link>
                    ) : (
                      "—"
                    ),
                },
                { title: "Since", dataIndex: "createdAt", render: formatDate },
              ]}
            />
          </Panel>
        )}

        <Panel $padded={false}>
          <PanelTitle style={{ padding: "16px 16px 0" }}>Recent calls</PanelTitle>
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            scroll={{ x: 760 }}
            dataSource={data.recentCalls}
            locale={{ emptyText: "No calls yet" }}
            columns={[
              { title: "Started", dataIndex: "startedAt", render: formatDateTime },
              { title: "Project", dataIndex: "projectName" },
              { title: "Agent", dataIndex: "agentName", render: (n: string | null) => n ?? "—" },
              {
                title: "Channel",
                dataIndex: "channel",
                render: (c: string, row) => `${CHANNEL[c] ?? c}${row.to ? ` · ${row.to}` : ""}`,
              },
              {
                title: "Outcome",
                dataIndex: "outcome",
                render: (_, row) => <OutcomeTag outcome={row.outcome} />,
              },
              {
                title: "Duration",
                key: "duration",
                align: "right",
                render: (_, row) => formatDuration(row.startedAt, row.endedAt),
              },
            ]}
          />
        </Panel>
      </Stack>
    </>
  );
}

export default function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data, error, mutate } = useAdminUser(userId);

  return (
    <>
      <Back href={routes.admin}>
        <ArrowLeftOutlined aria-hidden />
        All users
      </Back>
      {data ? (
        <Detail data={data} />
      ) : error ? (
        <LoadError error={error} what="this user" onRetry={() => void mutate()} />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} />
      )}
    </>
  );
}
