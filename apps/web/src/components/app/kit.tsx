"use client";

import {
  BranchesOutlined,
  FlagOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import type { FlowNode, Outcome } from "@oxumi/flow-core";
import { Tag } from "antd";
import type { ReactNode } from "react";
import styled from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";

// Shared building blocks for in-app pages, so every screen has the same
// rhythm. Reach for Ant Design components for controls and data display, and
// for these when laying out a page.

export const Page = styled.div`
  width: 100%;
  max-width: 1320px;
  margin-inline: auto;
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)}
    ${({ theme }) => theme.space(10)};
`;

const HeaderRow = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(5)};

  h1 {
    ${type("title")}
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    max-width: 44rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;
// Wraps the actions onto their own line before squeezing the text.
const HeaderText = styled.div`
  flex: 1 1 280px;
  min-width: 0;
`;
const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <HeaderRow>
      <HeaderText>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </HeaderText>
      {actions && <HeaderActions>{actions}</HeaderActions>}
    </HeaderRow>
  );
}

// A bordered surface for grouping related content.
export const Panel = styled.section<{ $padded?: boolean }>`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  padding: ${({ theme, $padded = true }) => ($padded ? theme.space(4) : 0)};
`;

export const PanelTitle = styled.h2`
  ${type("heading")}
  color: ${({ theme }) => theme.color.fg};
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

export const Overline = styled.p`
  ${type("overline")}
  color: ${({ theme }) => theme.color.fgSubtle};
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.color.fgMuted};
`;

export const Mono = styled.span`
  ${type("code")}
`;

const StatBox = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};

  strong {
    ${type("title")}
    font-size: 1.375rem;
    line-height: 1.75rem;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <StatBox>
      <Overline>{label}</Overline>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </StatBox>
  );
}

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(6)};
  border: 1px dashed ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  text-align: center;

  .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-bottom: ${({ theme }) => theme.space(4)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accentText};
    font-size: 20px;
  }
  h2 {
    ${type("heading")}
  }
  p {
    ${type("body")}
    max-width: 24rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .action {
    margin-top: ${({ theme }) => theme.space(5)};
  }
`;

export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <EmptyBox>
      {icon && <div className="icon">{icon}</div>}
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="action">{action}</div>}
    </EmptyBox>
  );
}

// ---- Domain vocabulary: one look for each outcome and node kind ----------

const OUTCOME: Record<Outcome | "in_progress", { label: string; color: string }> = {
  completed: { label: "Completed", color: "success" },
  partial: { label: "Partial", color: "warning" },
  callback_requested: { label: "Callback requested", color: "processing" },
  wrong_person: { label: "Wrong person", color: "default" },
  opted_out: { label: "Opted out", color: "default" },
  transferred: { label: "Transferred", color: "cyan" },
  failed: { label: "Failed", color: "error" },
  in_progress: { label: "In progress", color: "processing" },
};

export function OutcomeTag({ outcome }: { outcome: Outcome | null }) {
  const { label, color: tone } = OUTCOME[outcome ?? "in_progress"];
  return (
    <Tag color={tone} variant="filled">
      {label}
    </Tag>
  );
}

export function ReadyTag({ ready }: { ready: boolean }) {
  return (
    <Tag color={ready ? "success" : "warning"} variant="filled">
      {ready ? "Ready" : "Needs attention"}
    </Tag>
  );
}

export const NODE_KIND: Record<
  FlowNode["type"],
  { label: string; color: string; icon: ReactNode; description: string }
> = {
  start: {
    label: "Start",
    color: color.node.start,
    icon: <PlayCircleOutlined />,
    description: "Greets the person and says who is calling",
  },
  say: {
    label: "Say",
    color: color.node.say,
    icon: <MessageOutlined />,
    description: "Speaks a line, then moves on",
  },
  ask: {
    label: "Ask",
    color: color.node.ask,
    icon: <QuestionCircleOutlined />,
    description: "Collects one or more answers",
  },
  branch: {
    label: "Branch",
    color: color.node.branch,
    icon: <BranchesOutlined />,
    description: "Chooses a path from an answer",
  },
  transfer: {
    label: "Transfer",
    color: color.node.transfer,
    icon: <UserSwitchOutlined />,
    description: "Hands the caller to a person",
  },
  end: {
    label: "End",
    color: color.node.end,
    icon: <FlagOutlined />,
    description: "Says goodbye and ends the call",
  },
};

// ---- Formatting -----------------------------------------------------------

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  const seconds = Math.max(0, Math.round((+new Date(endIso) - +new Date(startIso)) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function formatMs(ms: number | null): string {
  return ms === null ? "—" : `${ms} ms`;
}

export function modelLabel(ref: string): string {
  return ref ? ref.slice(ref.indexOf(":") + 1) : "Server default";
}
