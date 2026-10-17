"use client";

import { LoginOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Popconfirm, Table, Tooltip } from "antd";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import styled from "styled-components";
import { useImpersonate } from "@/components/admin/useImpersonate";
import { Muted, PageHeader } from "@/components/app/kit";
import { formatDate, formatRelative, plural } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { type AdminProjectRow, useAdminProjects } from "@/lib/api";
import { routes } from "@/lib/routes";

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

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
`;

const num = (n: number) => n.toLocaleString();

export default function AdminProjectsPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const { data, error, isLoading, mutate } = useAdminProjects(deferred);
  const { start, pending } = useImpersonate();

  return (
    <>
      <PageHeader
        title="All projects"
        description="Every project on this deployment with its owner and activity. Open one as its owner to see it as they do."
      />
      <Toolbar>
        <Input
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Search project or owner"
          aria-label="Search projects"
        />
        {data && (
          <Muted role="status">
            {plural(data.length, "project")}
            {data.length >= 500 ? " (first 500)" : ""}
          </Muted>
        )}
      </Toolbar>
      {error && !data ? (
        <LoadError error={error} what="projects" onRetry={() => void mutate()} />
      ) : (
        <Table<AdminProjectRow>
          rowKey="id"
          size="middle"
          loading={isLoading && !data}
          dataSource={data ?? []}
          pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
          scroll={{ x: 900 }}
          columns={[
            {
              title: "Project",
              key: "name",
              render: (_, row) => (
                <Stack>
                  <strong>{row.name}</strong>
                  {row.description && <Muted>{row.description}</Muted>}
                </Stack>
              ),
            },
            {
              title: "Owner",
              key: "owner",
              render: (_, row) =>
                row.owner ? (
                  <Stack>
                    <Link href={routes.adminUser(row.owner.id)}>
                      {row.owner.name || row.owner.email}
                    </Link>
                    <Muted>{row.owner.email}</Muted>
                  </Stack>
                ) : (
                  <Muted>No owner</Muted>
                ),
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
              title: "Last call",
              dataIndex: "lastCallAt",
              render: (iso: string | null) => (iso ? formatRelative(iso) : <Muted>None</Muted>),
              sorter: (a, b) => (a.lastCallAt ?? "").localeCompare(b.lastCallAt ?? ""),
            },
            {
              title: "Created",
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
                row.owner && (
                  <Popconfirm
                    title={`Open as ${row.owner.email}?`}
                    description="You'll be signed in as the owner for up to an hour."
                    okText="Open as owner"
                    onConfirm={() => start(row.owner!.id, routes.project(row.id))}
                  >
                    <Tooltip title="Open as owner">
                      <Button
                        size="small"
                        icon={<LoginOutlined />}
                        loading={pending === row.owner.id}
                        aria-label={`Open ${row.name} as its owner`}
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
