"use client";

import { LoginOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Popconfirm, Skeleton, Table, Tag, Tooltip } from "antd";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import styled from "styled-components";
import { DailyBars } from "@/components/admin/DailyBars";
import { useImpersonate } from "@/components/admin/useImpersonate";
import { Muted, PageHeader, Stat } from "@/components/app/kit";
import { formatDate, formatRelative, plural } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { type AdminUserRow, useAdminOverview, useAdminUsers, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Charts = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  .ant-input-affix-wrapper {
    max-width: 360px;
  }
`;

const Who = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  a {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

// Whichever happened last: a sign-in or a call.
const lastActive = (row: AdminUserRow) =>
  [row.lastLoginAt, row.lastCallAt]
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1) ?? null;

const num = (n: number) => n.toLocaleString();

function Overview() {
  const { data, error } = useAdminOverview();
  if (error) return <LoadError error={error} what="the overview" compact />;
  if (!data) return <Skeleton active paragraph={{ rows: 4 }} />;
  return (
    <>
      <Stats>
        <Stat
          label="Users"
          value={num(data.users)}
          hint={`${num(data.newUsers30d)} new in 30 days · ${num(data.signedIn)} signed in`}
        />
        <Stat label="Projects" value={num(data.projects)} hint={`${num(data.agents)} agents`} />
        <Stat label="Calls" value={num(data.calls)} hint={`${num(data.calls30d)} in 30 days`} />
        <Stat label="API requests" value={num(data.apiRequests30d)} hint="Last 30 days" />
      </Stats>
      <Charts>
        <DailyBars
          label="Signups, 30 days"
          days={data.byDay.map((d) => ({ date: d.date, value: d.signups ?? 0 }))}
        />
        <DailyBars
          label="Calls, 30 days"
          days={data.byDay.map((d) => ({ date: d.date, value: d.calls }))}
        />
        <DailyBars
          label="API requests, 30 days"
          days={data.byDay.map((d) => ({ date: d.date, value: d.apiRequests }))}
        />
      </Charts>
    </>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useSession();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const { data, error, isLoading, mutate } = useAdminUsers(deferred);
  const { start, pending } = useImpersonate();

  return (
    <>
      <PageHeader
        title="Admin console"
        description="Every account on this deployment, what it has built and how much it uses. Counts cover the projects each user owns."
      />
      <Overview />
      <Toolbar>
        <Input
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Search name, email or company"
          aria-label="Search users"
        />
        {data && (
          <Muted role="status">
            {plural(data.length, "user")}
            {data.length >= 500 ? " (first 500)" : ""}
          </Muted>
        )}
      </Toolbar>
      {error && !data ? (
        <LoadError error={error} what="users" onRetry={() => void mutate()} />
      ) : (
        <Table<AdminUserRow>
          rowKey="id"
          size="middle"
          loading={isLoading && !data}
          dataSource={data ?? []}
          pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
          scroll={{ x: 960 }}
          columns={[
            {
              title: "User",
              key: "user",
              render: (_, row) => (
                <Who>
                  <span>
                    <Link href={routes.adminUser(row.id)}>{row.name || row.email}</Link>{" "}
                    {row.role === "admin" && <Tag color="gold">Admin</Tag>}
                  </span>
                  <Muted>{row.email}</Muted>
                </Who>
              ),
            },
            {
              title: "Company",
              dataIndex: "company",
              render: (company: string) => company || <Muted>—</Muted>,
            },
            {
              title: "Projects",
              dataIndex: "projectCount",
              align: "right",
              sorter: (a, b) => a.projectCount - b.projectCount,
            },
            {
              title: "Agents",
              dataIndex: "agentCount",
              align: "right",
              sorter: (a, b) => a.agentCount - b.agentCount,
            },
            {
              title: "Calls",
              dataIndex: "callCount",
              align: "right",
              render: num,
              sorter: (a, b) => a.callCount - b.callCount,
            },
            {
              title: "API (30d)",
              dataIndex: "apiRequests30d",
              align: "right",
              render: num,
              sorter: (a, b) => a.apiRequests30d - b.apiRequests30d,
            },
            {
              title: "Last active",
              key: "lastActive",
              render: (_, row) => {
                const last = lastActive(row);
                return last ? formatRelative(last) : <Muted>Never</Muted>;
              },
              sorter: (a, b) => (lastActive(a) ?? "").localeCompare(lastActive(b) ?? ""),
            },
            {
              title: "Joined",
              dataIndex: "createdAt",
              render: formatDate,
              sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
              defaultSortOrder: "descend",
            },
            {
              title: "",
              key: "actions",
              align: "right",
              render: (_, row) =>
                row.role === "admin" || row.id === me?.id ? null : (
                  <Popconfirm
                    title={`Sign in as ${row.email}?`}
                    description="You'll see the app exactly as they do, for up to an hour."
                    okText="Sign in as user"
                    onConfirm={() => start(row.id)}
                  >
                    <Tooltip title="Sign in as this user">
                      <Button
                        size="small"
                        icon={<LoginOutlined />}
                        loading={pending === row.id}
                        aria-label={`Sign in as ${row.email}`}
                      />
                    </Tooltip>
                  </Popconfirm>
                ),
            },
          ]}
        />
      )}
    </>
  );
}
