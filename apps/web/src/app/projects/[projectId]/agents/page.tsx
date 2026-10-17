"use client";

import {
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Input, Table, type TableColumnsType } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { CreateAgentModal } from "@/components/app/agents/CreateAgentModal";
import { LoadError, TableSkeleton } from "@/components/app/agents/states";
import {
  Empty,
  formatDateTime,
  modelLabel,
  Page,
  PageHeader,
  Panel,
  ReadyTag,
} from "@/components/app/kit";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import { type AgentSummary, deleteAgent, useAgents } from "@/lib/api";
import { routes } from "@/lib/routes";

const GUIDE: Guide = {
  id: "agents",
  steps: [
    {
      title: "Agents",
      description:
        "An agent makes one kind of phone call for you, for example checking in with drivers or confirming appointments. You design the conversation once and it follows it on every call.",
    },
    {
      target: '[data-tour="agents-new"]',
      title: "Create an agent",
      description:
        "Start from a blank conversation, or from a ready-made template you can adjust.",
      placement: "bottomRight",
    },
    {
      target: '[data-tour="agents-table"]',
      title: "Your agents",
      description:
        "Click an agent to open it. From there you design its flow, set how it behaves, and try a test call.",
    },
    {
      target: '[data-tour="agents-status"]',
      title: "Ready, or needs attention",
      description:
        "Ready means the agent can take calls. Needs attention means something in its flow is unfinished; open the agent to see exactly what.",
    },
  ],
};

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(4)};

  .search {
    width: 100%;
    max-width: 280px;
  }
  .count {
    ${type("caption")}
    margin-left: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const TableWrap = styled(Panel)`
  overflow: hidden;

  .ant-table-wrapper .ant-table {
    background: transparent;
  }
  && .ant-table-thead > tr > th {
    ${type("caption")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .ant-table-tbody > tr {
    cursor: pointer;
  }
  .ant-table-tbody > tr:last-child > td {
    border-bottom: 0;
  }
`;

const NameCell = styled.div`
  min-width: 0;

  a {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
    border-radius: ${({ theme }) => theme.radius.control};
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
  p {
    ${type("caption")}
    max-width: 30rem;
    margin-top: ${({ theme }) => theme.space(0.5)};
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgMuted};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p.none {
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

const Num = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
`;

export default function AgentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { modal, message } = App.useApp();
  const agents = useAgents(projectId);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  usePageGuide(GUIDE);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = agents.data ?? [];
    return needle
      ? list.filter((a) => `${a.name} ${a.description}`.toLowerCase().includes(needle))
      : list;
  }, [agents.data, query]);

  const confirmDelete = (agent: AgentSummary) => {
    modal.confirm({
      title: `Delete "${agent.name}"?`,
      content:
        "The agent, its flow and its entire call history will be removed. This cannot be undone.",
      okText: "Delete agent",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await deleteAgent(agent);
          message.success(`Deleted "${agent.name}"`);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not delete the agent.");
        }
      },
    });
  };

  const columns: TableColumnsType<AgentSummary> = [
    {
      title: "Agent",
      dataIndex: "name",
      render: (_, agent) => (
        <NameCell>
          <Link href={routes.agent(projectId, agent.id)} onClick={(e) => e.stopPropagation()}>
            {agent.name}
          </Link>
          <p className={agent.description ? undefined : "none"}>
            {agent.description || "No description"}
          </p>
        </NameCell>
      ),
    },
    {
      title: "Status",
      dataIndex: "ready",
      width: 160,
      render: (ready: boolean, _agent, index) => (
        <span data-tour={index === 0 ? "agents-status" : undefined}>
          <ReadyTag ready={ready} />
        </span>
      ),
    },
    {
      title: "Steps",
      dataIndex: "stepCount",
      width: 90,
      align: "right",
      render: (count: number) => <Num>{count}</Num>,
    },
    {
      title: "Model",
      dataIndex: "model",
      width: 200,
      responsive: ["md"],
      render: (model: string) => <Num>{modelLabel(model)}</Num>,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 150,
      responsive: ["md"],
      render: (iso: string) => <Num>{formatDateTime(iso)}</Num>,
    },
    {
      key: "actions",
      width: 56,
      align: "right",
      render: (_, agent) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "delete",
                  danger: true,
                  icon: <DeleteOutlined />,
                  label: "Delete agent",
                  onClick: () => confirmDelete(agent),
                },
              ],
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              aria-label={`Actions for ${agent.name}`}
            />
          </Dropdown>
        </span>
      ),
    },
  ];

  const newButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      data-tour="agents-new"
      onClick={() => setCreating(true)}
    >
      New agent
    </Button>
  );

  let body;
  if (agents.error && !agents.data) {
    body = (
      <LoadError
        title="Agents could not be loaded"
        error={agents.error}
        onRetry={() => agents.mutate()}
      />
    );
  } else if (!agents.data) {
    body = <TableSkeleton rows={4} />;
  } else if (agents.data.length === 0) {
    body = (
      <Empty
        icon={<RobotOutlined />}
        title="Create your first agent"
        description="An agent is one kind of call: the conversation flow, what it needs to know beforehand and the answers it must bring back. Start blank or from a template."
        action={newButton}
      />
    );
  } else {
    body = (
      <>
        <Toolbar>
          <Input
            className="search"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search agents"
            aria-label="Search agents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="count">
            {visible.length === agents.data.length
              ? `${agents.data.length} ${agents.data.length === 1 ? "agent" : "agents"}`
              : `${visible.length} of ${agents.data.length} agents`}
          </span>
        </Toolbar>
        <TableWrap $padded={false} data-tour="agents-table">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={visible}
            pagination={visible.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
            onRow={(agent) => ({
              onClick: () => router.push(routes.agent(projectId, agent.id)),
            })}
            locale={{ emptyText: `No agents match "${query.trim()}"` }}
          />
        </TableWrap>
      </>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Agents"
        description="Each agent runs one kind of call. Design its flow, test it, then review what it collected."
        actions={agents.data && agents.data.length > 0 ? newButton : undefined}
      />
      {body}
      <CreateAgentModal projectId={projectId} open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
