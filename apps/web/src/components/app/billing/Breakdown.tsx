"use client";

import { Table, type TableColumnsType } from "antd";
import Link from "next/link";
import styled from "styled-components";
import { Panel, PanelTitle } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import type { BillingReport, Channel } from "@/lib/api";
import { routes } from "@/lib/routes";
import { formatMoney } from "./format";

export const CHANNEL: Record<Channel, string> = {
  phone: "Phone",
  browser_voice: "Browser voice test",
  browser_text: "Browser text test",
  api_text: "API text",
};

type ChannelRow = BillingReport["byChannel"][number];
type AgentRow = BillingReport["byAgent"][number];

const Box = styled(Panel)`
  overflow: hidden;

  ${PanelTitle} {
    margin: 0;
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  .ant-table-wrapper .ant-table {
    background: transparent;
  }
  && .ant-table-thead > tr > th {
    ${type("caption")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .name {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  a.name:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

// Shared numeric columns: calls, billable minutes and cost.
function numbers<T extends { calls: number; minutes: number; cost: number }>(): TableColumnsType<T> {
  return [
    {
      title: "Calls",
      dataIndex: "calls",
      align: "right",
      className: "num",
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: "Minutes",
      dataIndex: "minutes",
      align: "right",
      className: "num",
      render: (n: number) => n.toLocaleString(),
    },
    {
      title: "Cost",
      dataIndex: "cost",
      align: "right",
      className: "num",
      render: (n: number) => <span className="name">{formatMoney(n)}</span>,
    },
  ];
}

export function ChannelTable({ rows }: { rows: ChannelRow[] }) {
  const columns: TableColumnsType<ChannelRow> = [
    {
      title: "Channel",
      dataIndex: "channel",
      render: (channel: Channel) => <span className="name">{CHANNEL[channel] ?? channel}</span>,
    },
    ...numbers<ChannelRow>(),
  ];
  return (
    <Box $padded={false} aria-labelledby="billing-channels">
      <PanelTitle id="billing-channels">By channel</PanelTitle>
      <Table
        rowKey="channel"
        size="small"
        columns={columns}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        pagination={false}
        locale={{ emptyText: "No calls this month" }}
      />
    </Box>
  );
}

export function AgentTable({ rows, projectId }: { rows: AgentRow[]; projectId: string }) {
  const columns: TableColumnsType<AgentRow> = [
    {
      title: "Agent",
      dataIndex: "agentName",
      // The API names agents that no longer exist "Deleted agent"; those have
      // nothing to link to.
      render: (name: string, row) =>
        name === "Deleted agent" ? (
          <span className="name">{name}</span>
        ) : (
          <Link className="name" href={routes.agent(projectId, row.agentId)}>
            {name}
          </Link>
        ),
    },
    ...numbers<AgentRow>(),
  ];
  return (
    <Box $padded={false} aria-labelledby="billing-agents">
      <PanelTitle id="billing-agents">By agent</PanelTitle>
      <Table
        rowKey="agentId"
        size="small"
        columns={columns}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        pagination={rows.length > 10 ? { pageSize: 10, size: "small", showSizeChanger: false } : false}
        locale={{ emptyText: "No calls this month" }}
      />
    </Box>
  );
}
