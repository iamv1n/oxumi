"use client";

import { RightOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import styled from "styled-components";
import { Panel } from "@/components/app/kit";
import type { AgentSummary, Credential, Health } from "@/lib/api";
import { type } from "@oxumi/ui/design/typography";
import { ProviderTile } from "./logos/ProviderLogo";
import {
  agentCount,
  ago,
  isConnected,
  type Kind,
  KINDS,
  listed,
  needsAttention,
  PURPOSE,
  statusDetail,
  statusOf,
  type Usage,
  usageCount,
  usageOf,
} from "./model";
import { StatusMark } from "./StatusMark";

// Every provider the project can connect, grouped by what it is for. One row
// each: logo, name, purpose, status, saved key, last test and who uses it.
// A row opens the provider's panel.

// The same columns in every group, so the page reads as one table.
const COLUMNS = "28px minmax(0, 1.25fr) minmax(0, 1.35fr) 64px 152px minmax(0, 0.9fr) 14px";

const Group = styled(Panel)`
  overflow: hidden;
  scroll-margin-top: ${({ theme }) => theme.space(4)};
`;

const GroupHead = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};

  h2 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    flex: 1;
    min-width: 12rem;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  span {
    ${type("caption")}
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  span b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.warning};
  }
`;

const Heads = styled.div`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Item = styled.li`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const Row = styled.button`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 14px;
  gap: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(3)};
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast};

  &:hover,
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.hover};
  }
  &:focus-visible {
    position: relative;
    z-index: 1;
  }

  .name,
  .status,
  .use {
    min-width: 0;
  }
  strong {
    display: block;
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    display: block;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status small[data-tone="danger"] {
    color: ${({ theme }) => theme.color.danger};
  }
  code {
    ${type("code")}
    font-size: 0.75rem;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .when,
  .use {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .when {
    white-space: nowrap;
  }
  .use b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
  .none {
    color: ${({ theme }) => theme.color.fgFaint};
  }
  .go {
    font-size: 10px;
    color: ${({ theme }) => theme.color.fgFaint};
  }

  /* Narrow: name and chevron on the first line, the rest wraps beneath. */
  .logo {
    grid-row: span 2;
    align-self: start;
  }
  .go {
    grid-row: 1;
    grid-column: 3;
  }
  .status,
  .key,
  .when,
  .use {
    grid-column: 2 / -1;
  }
  .key,
  .when {
    display: none;
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: ${COLUMNS};

    .logo {
      grid-row: auto;
      align-self: center;
    }
    .go,
    .status,
    .key,
    .when,
    .use {
      grid-row: auto;
      grid-column: auto;
    }
    .key,
    .when {
      display: block;
    }
  }
`;

function usageText(usage: Usage) {
  const count = usageCount(usage);
  if (!count) return usage.isDefault ? "Default, no agents yet" : null;
  return `${usage.isDefault ? "Default · " : ""}${agentCount(count)}`;
}

function usageTip(usage: Usage) {
  const parts = [
    usage.named.length && `Set on ${listed(usage.named.map((a) => a.name))}.`,
    usage.byDefault.length &&
      `Used by default for ${listed(usage.byDefault.map((a) => a.name))}, which ${
        usage.byDefault.length === 1 ? "does" : "do"
      } not name a provider.`,
  ].filter(Boolean);
  return parts.join(" ");
}

function ProviderItem({
  credential,
  usage,
  open,
  onOpen,
}: {
  credential: Credential;
  usage: Usage;
  open: boolean;
  onOpen: (provider: string) => void;
}) {
  const status = statusOf(credential);
  const detail = statusDetail(credential);
  const hint = credential.hint?.replace(/^…+/, "");
  // A failed test clears the verified time; the row was last touched by it.
  const tested =
    status === "ok" && credential.verifiedAt
      ? `Verified ${ago(credential.verifiedAt)}`
      : status === "rejected" && credential.updatedAt
        ? `Tested ${ago(credential.updatedAt)}`
        : null;
  const used = usageText(usage);
  const tip = usageTip(usage);

  return (
    <Item data-provider={credential.provider} data-status={status}>
      <Row
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpen(credential.provider)}
      >
        <span className="logo">
          <ProviderTile provider={credential.provider} label={credential.label} />
        </span>
        <span className="name">
          <strong>{credential.label}</strong>
          <small>{PURPOSE[credential.provider] ?? ""}</small>
        </span>
        <span className="status">
          <StatusMark status={status} />
          {detail && (
            <small data-tone={status === "rejected" ? "danger" : undefined} title={detail}>
              {detail}
            </small>
          )}
        </span>
        <span className="key">
          {hint ? (
            <code aria-label={`key ending ${hint}`}>…{hint}</code>
          ) : (
            <span className="none" aria-hidden>
              –
            </span>
          )}
        </span>
        <span className="when">
          {tested ?? (
            <span className="none" aria-hidden>
              –
            </span>
          )}
        </span>
        <span className="use">
          {used ? (
            <Tooltip title={tip || undefined}>
              <span>{used}</span>
            </Tooltip>
          ) : (
            <span className="none">No agents</span>
          )}
        </span>
        <RightOutlined className="go" aria-hidden />
      </Row>
    </Item>
  );
}

export const groupId = (kind: Kind) => `integrations-${kind}`;

export function ProviderList({
  credentials,
  agents,
  health,
  openProvider,
  onOpen,
}: {
  credentials: Credential[];
  agents?: AgentSummary[];
  health?: Health;
  openProvider: string | null;
  onOpen: (provider: string) => void;
}) {
  return (
    <>
      {KINDS.map(({ kind, title, description, tour }, index) => {
        const rows = credentials.filter((c) => c.kind === kind);
        if (!rows.length) return null;
        const states = rows.map(statusOf);
        const connected = states.filter(isConnected).length;
        const attention = states.filter(needsAttention).length;
        const platform = states.filter((s) => s === "platform").length;
        return (
          <Group key={kind} id={groupId(kind)} $padded={false} data-tour={tour} aria-label={title}>
            <GroupHead>
              <h2>{title}</h2>
              <p>{description}</p>
              <span>
                {connected} of {rows.length} connected
                {platform > 0 && ` · ${platform} on the platform key`}
                {attention > 0 && (
                  <>
                    {" · "}
                    <b>
                      {attention} {attention === 1 ? "needs" : "need"} attention
                    </b>
                  </>
                )}
              </span>
            </GroupHead>
            {/* The columns are the same in every group, so they are named once. */}
            {index === 0 && (
              <Heads aria-hidden>
                <span />
                <span>Provider</span>
                <span>Status</span>
                <span>Key</span>
                <span>Last test</span>
                <span>Used by</span>
                <span />
              </Heads>
            )}
            <ul>
              {rows.map((credential) => (
                <ProviderItem
                  key={credential.provider}
                  credential={credential}
                  usage={usageOf(credential, agents, health)}
                  open={openProvider === credential.provider}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </Group>
        );
      })}
    </>
  );
}
