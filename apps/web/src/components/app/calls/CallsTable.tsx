"use client";

import {
  ApiOutlined,
  AudioOutlined,
  ExperimentOutlined,
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { OUTCOMES, type Outcome } from "@oxumi/flow-core";
import { Button, Select, Table, type TableColumnsType, Tag, Tooltip } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { LoadError, TableSkeleton } from "@/components/app/agents/states";
import {
  Empty,
  formatDateTime,
  formatDuration,
  modelLabel,
  OutcomeTag,
  Panel,
} from "@/components/app/kit";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import { type CallListItem, type Channel, useAgents, useCalls } from "@/lib/api";
import { routes } from "@/lib/routes";

type OutcomeFilter = Outcome | "in_progress";

const OUTCOME_LABEL: Record<OutcomeFilter, string> = {
  completed: "Completed",
  partial: "Partial",
  callback_requested: "Callback requested",
  wrong_person: "Wrong person",
  opted_out: "Opted out",
  transferred: "Transferred",
  failed: "Failed",
  in_progress: "In progress",
};

export const CHANNEL: Record<Channel, { label: string; icon: React.ReactNode }> = {
  browser_voice: { label: "Voice", icon: <AudioOutlined /> },
  browser_text: { label: "Text", icon: <MessageOutlined /> },
  api_text: { label: "API", icon: <ApiOutlined /> },
  phone: { label: "Phone", icon: <PhoneOutlined /> },
};

const TELEPHONY: Record<string, string> = { twilio: "Twilio", exotel: "Exotel", vobiz: "Vobiz" };
export const telephonyLabel = (id: string | null) => (id ? (TELEPHONY[id] ?? id) : null);

// How a call ended, or where it has got to if it has not.
export function CallStateTag({ call }: { call: Pick<CallListItem, "outcome" | "status"> }) {
  if (call.outcome === null && call.status === "queued")
    return <Tag variant="filled">Queued</Tag>;
  if (call.outcome === null && call.status === "ringing")
    return (
      <Tag color="processing" variant="filled">
        Ringing
      </Tag>
    );
  return <OutcomeTag outcome={call.outcome} />;
}

const GUIDE: Guide = {
  id: "calls",
  steps: [
    {
      target: '[data-tour="calls-table"]',
      title: "Every call, newest first",
      description:
        "Each row is one call: when it started, which agent made it, how many turns it took and how long it lasted.",
    },
    {
      target: '[data-tour="calls-outcome"]',
      title: "How the call ended",
      description:
        "Completed means every answer was collected. Partial means the call ended early. Callback requested, Wrong person and Opted out are things the person said. Failed means a technical problem.",
    },
    {
      target: '[data-tour="calls-filters"]',
      title: "Narrow the list",
      description:
        "Show only calls that ended a certain way, or only one agent's calls. The refresh button on the right picks up new calls.",
    },
    {
      target: '[data-tour="calls-first-row"]',
      title: "Open a call",
      description:
        "Click a row to read the conversation, see the answers collected and how quickly the agent replied.",
    },
  ],
};

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(4)};

  .ant-select {
    width: 180px;
    max-width: 100%;
  }
  .count {
    ${type("caption")}
    margin-left: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
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
  .ant-table-tbody > tr > td {
    white-space: nowrap;
  }
  .ant-pagination {
    margin: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  }
  .ant-tag {
    margin: 0;
  }
  .go {
    color: ${({ theme }) => theme.color.fgFaint};
    font-size: 11px;
  }
  tr:hover .go {
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const When = styled(Link)`
  ${type("label")}
  color: ${({ theme }) => theme.color.fg};
  font-variant-numeric: tabular-nums;
  border-radius: ${({ theme }) => theme.radius.control};

  &:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const StateCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  small {
    ${type("caption")}
    max-width: 14rem;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
  }
`;

const Soft = styled.span`
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;

  .to {
    margin-left: ${({ theme }) => theme.space(2)};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.text.caption.size};
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  .anticon {
    margin-right: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

// The calls of a project, or of one agent when `agentId` is given.
export function CallsTable({ projectId, agentId }: { projectId: string; agentId?: string }) {
  const router = useRouter();
  const calls = useCalls(projectId, agentId);
  const agents = useAgents(agentId ? undefined : projectId);
  const [outcome, setOutcome] = useState<OutcomeFilter | undefined>();
  const [agentFilter, setAgentFilter] = useState<string | undefined>();
  const [channel, setChannel] = useState<Channel | undefined>();
  usePageGuide(GUIDE);

  const visible = useMemo(
    () =>
      (calls.data ?? []).filter(
        (call) =>
          (!outcome || (call.outcome ?? "in_progress") === outcome) &&
          (!agentFilter || call.agentId === agentFilter) &&
          (!channel || call.channel === channel),
      ),
    [calls.data, outcome, agentFilter, channel],
  );

  // Only offer outcomes that occur, with how many calls each has.
  const outcomeOptions = useMemo(() => {
    const counts = new Map<OutcomeFilter, number>();
    for (const call of calls.data ?? []) {
      if (agentFilter && call.agentId !== agentFilter) continue;
      const key = call.outcome ?? "in_progress";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return ([...OUTCOMES, "in_progress"] as OutcomeFilter[])
      .filter((key) => counts.has(key) || key === outcome)
      .map((key) => ({ value: key, label: `${OUTCOME_LABEL[key]} (${counts.get(key) ?? 0})` }));
  }, [calls.data, agentFilter, outcome]);

  if (calls.error && !calls.data)
    return (
      <LoadError
        title="Calls could not be loaded"
        error={calls.error}
        onRetry={() => calls.mutate()}
      />
    );
  if (!calls.data) return <TableSkeleton rows={6} />;

  if (calls.data.length === 0)
    return agentId ? (
      <Empty
        icon={<PhoneOutlined />}
        title="No calls yet"
        description="Run this agent from the Test tab, or place a call through the API. Every call lands here with its transcript, the answers it collected and how fast each reply came."
        action={
          <Link href={routes.agentTest(projectId, agentId)}>
            <Button type="primary" icon={<ExperimentOutlined />}>
              Open the Test tab
            </Button>
          </Link>
        }
      />
    ) : (
      <Empty
        icon={<PhoneOutlined />}
        title="No calls yet"
        description="Open an agent and run it from its Test tab. Every call in this project lands here with its transcript, collected answers and reply latency."
        action={
          <Link href={routes.agents(projectId)}>
            <Button type="primary">Go to agents</Button>
          </Link>
        }
      />
    );

  const columns: TableColumnsType<CallListItem> = [
    {
      title: "Started",
      dataIndex: "startedAt",
      render: (iso: string, call, index) => (
        <When
          href={routes.call(projectId, call.id)}
          data-tour={index === 0 ? "calls-first-row" : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {formatDateTime(iso)}
        </When>
      ),
    },
    ...(agentId
      ? []
      : ([
          {
            title: "Agent",
            key: "agent",
            ellipsis: true,
            render: (_, call) => call.agent?.name ?? "Deleted agent",
          },
        ] satisfies TableColumnsType<CallListItem>)),
    {
      title: "Outcome",
      dataIndex: "outcome",
      render: (_value: Outcome | null, call, index) => (
        <StateCell data-tour={index === 0 ? "calls-outcome" : undefined}>
          <CallStateTag call={call} />
          {call.error && <small title={call.error}>{call.error}</small>}
        </StateCell>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      responsive: ["md"],
      render: (channel: Channel, call) => (
        <Soft>
          {CHANNEL[channel]?.icon}
          {CHANNEL[channel]?.label ?? channel}
          {call.to && <span className="to">{call.to}</span>}
        </Soft>
      ),
    },
    {
      title: "Model",
      dataIndex: "model",
      responsive: ["lg"],
      render: (model: string) => <Soft>{modelLabel(model)}</Soft>,
    },
    {
      title: "Turns",
      dataIndex: "turnCount",
      align: "right",
      width: 80,
      render: (count: number) => <Soft>{count}</Soft>,
    },
    {
      title: "Duration",
      key: "duration",
      align: "right",
      width: 110,
      render: (_, call) => <Soft>{formatDuration(call.startedAt, call.endedAt)}</Soft>,
    },
    {
      key: "go",
      width: 40,
      align: "right",
      render: () => <RightOutlined className="go" aria-hidden />,
    },
  ];

  const filtered = visible.length !== calls.data.length;
  // Only offer channels that occur in this list.
  const all = calls.data;
  const channelOptions = (Object.keys(CHANNEL) as Channel[])
    .filter((key) => all.some((call) => call.channel === key) || key === channel)
    .map((key) => ({ value: key, label: CHANNEL[key].label }));

  return (
    <>
      <Toolbar data-tour="calls-filters">
        <Select<OutcomeFilter>
          allowClear
          placeholder="All outcomes"
          aria-label="Filter by outcome"
          value={outcome}
          onChange={setOutcome}
          options={outcomeOptions}
        />
        {!agentId && (
          <Select<string>
            allowClear
            showSearch={{ optionFilterProp: "label" }}
            placeholder="All agents"
            aria-label="Filter by agent"
            value={agentFilter}
            onChange={setAgentFilter}
            loading={agents.isLoading}
            options={(agents.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          />
        )}
        {channelOptions.length > 1 && (
          <Select<Channel>
            allowClear
            placeholder="All channels"
            aria-label="Filter by channel"
            value={channel}
            onChange={setChannel}
            options={channelOptions}
          />
        )}
        {filtered && (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setOutcome(undefined);
              setAgentFilter(undefined);
              setChannel(undefined);
            }}
          >
            Clear filters
          </Button>
        )}
        <span className="count" aria-live="polite">
          {filtered
            ? `${visible.length} of ${calls.data.length} calls`
            : `${calls.data.length} ${calls.data.length === 1 ? "call" : "calls"}`}
          {calls.data.length >= 200 && " (latest 200)"}
        </span>
        <Tooltip title="Refresh">
          <Button
            icon={<ReloadOutlined />}
            aria-label="Refresh calls"
            loading={calls.isValidating}
            onClick={() => calls.mutate()}
          />
        </Tooltip>
      </Toolbar>
      <TableWrap $padded={false} data-tour="calls-table">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visible}
          scroll={{ x: "max-content" }}
          pagination={
            visible.length > 25
              ? { pageSize: 25, showSizeChanger: false, size: "small" }
              : false
          }
          onRow={(call) => ({
            onClick: () => router.push(routes.call(projectId, call.id)),
          })}
          locale={{ emptyText: "No calls match these filters" }}
        />
      </TableWrap>
    </>
  );
}
