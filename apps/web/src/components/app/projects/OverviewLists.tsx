"use client";

import {
  AudioOutlined,
  MessageOutlined,
  RightOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Skeleton } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { AgentSummary, CallListItem } from "@/lib/api";
import { routes } from "@/lib/routes";
import { formatDateTime, formatDuration, OutcomeTag, Panel, ReadyTag } from "../kit";
import { formatRelative, plural } from "./format";

// The list panels on the project overview: recent calls and agents.

const Shell = styled(Panel)`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(10)};
  padding-inline: ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h2 {
    ${type("label")}
    flex: 1;
    min-width: 0;
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  .count {
    margin-left: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  a {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    border-radius: ${({ theme }) => theme.radius.small};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
  a .anticon {
    font-size: 9px;
  }
`;

const Body = styled.div<{ $padded?: boolean }>`
  padding: ${({ theme, $padded }) => ($padded ? theme.space(4) : 0)};
`;

// A titled panel with an optional count and "view all" link.
export function ListPanel({
  title,
  count,
  href,
  linkLabel = "View all",
  padded,
  children,
}: {
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <Shell $padded={false}>
      <Head>
        <h2>
          {title}
          {count !== undefined && <span className="count">{count.toLocaleString()}</span>}
        </h2>
        {href && (
          <Link href={href}>
            {linkLabel}
            <RightOutlined aria-hidden />
          </Link>
        )}
      </Head>
      <Body $padded={padded}>{children}</Body>
    </Shell>
  );
}

const Rows = styled.ul`
  li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  li:last-child a {
    border-radius: 0 0 ${({ theme }) => theme.radius.card} ${({ theme }) => theme.radius.card};
  }
`;

const RowLink = styled(Link)`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(10)};
  padding-inline: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fg};
  transition: background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.hover};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }

  .icon {
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .primary {
    flex: 0 1 auto;
    min-width: ${({ theme }) => theme.space(16)};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .secondary {
    ${type("caption")}
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .aside {
    ${type("caption")}
    display: none;
    flex: none;
    color: ${({ theme }) => theme.color.fgMuted};
    font-variant-numeric: tabular-nums;
  }
  .ant-tag {
    flex: none;
    margin: 0;
  }
  .chevron {
    flex: none;
    font-size: 9px;
    color: ${({ theme }) => theme.color.fgFaint};
  }

  ${({ theme }) => theme.media.sm} {
    .aside {
      display: block;
    }
  }
`;

export function RecentCalls({ projectId, calls }: { projectId: string; calls: CallListItem[] }) {
  return (
    <Rows>
      {calls.map((call) => {
        const voice = call.channel === "browser_voice";
        return (
          <li key={call.id}>
            <RowLink href={routes.call(projectId, call.id)}>
              <span className="icon" aria-hidden>
                {voice ? <AudioOutlined /> : <MessageOutlined />}
              </span>
              <span className="primary">{call.agent.name}</span>
              <span className="secondary">
                {formatDateTime(call.startedAt)} · {voice ? "Voice" : "Text"} ·{" "}
                {plural(call.turnCount, "turn")}
              </span>
              <span className="aside">{formatDuration(call.startedAt, call.endedAt)}</span>
              <OutcomeTag outcome={call.outcome} />
              <RightOutlined className="chevron" aria-hidden />
            </RowLink>
          </li>
        );
      })}
    </Rows>
  );
}

export function AgentRows({ projectId, agents }: { projectId: string; agents: AgentSummary[] }) {
  return (
    <Rows>
      {agents.map((agent) => (
        <li key={agent.id}>
          <RowLink href={routes.agent(projectId, agent.id)}>
            <span className="icon" aria-hidden>
              <RobotOutlined />
            </span>
            <span className="primary">{agent.name}</span>
            <span className="secondary">
              {plural(agent.stepCount, "step")} · Updated {formatRelative(agent.updatedAt)}
            </span>
            <ReadyTag ready={agent.ready} />
            <RightOutlined className="chevron" aria-hidden />
          </RowLink>
        </li>
      ))}
    </Rows>
  );
}

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.space(10)};
  padding-inline: ${({ theme }) => theme.space(4)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i}>
          <Skeleton.Node active style={{ width: `${44 - i * 6}%`, height: 12 }} />
        </SkeletonRow>
      ))}
    </div>
  );
}

const Blank = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};

  .icon {
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .text {
    flex: 1;
    min-width: min(100%, 220px);
  }
  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// The empty state inside a panel (the kit's `Empty` is sized for whole pages).
export function PanelEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Blank>
      <span className="icon" aria-hidden>
        {icon}
      </span>
      <div className="text">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </Blank>
  );
}

const Inline = styled.p`
  ${type("label")}
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.danger};
  font-weight: 400;
`;

export function PanelError({ message }: { message: string }) {
  return <Inline role="alert">{message}</Inline>;
}
