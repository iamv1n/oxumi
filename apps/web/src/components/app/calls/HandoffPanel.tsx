"use client";

import { Tag } from "antd";
import styled from "styled-components";
import { formatDateTime, Panel, PanelTitle } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import type { Handoff } from "@/lib/api";
import { isHindi } from "./Transcript";

// Where a call was handed to a person: by a transfer step, or because the
// caller asked for one.

const STATUS: Record<Handoff["status"], { label: string; color: string }> = {
  connected: { label: "Connected", color: "success" },
  simulated: { label: "Simulated in a test call", color: "processing" },
  failed: { label: "Failed", color: "error" },
};

const Facts = styled.dl`
  display: flex;
  flex-direction: column;

  > div {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(2.5)} 0;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  > div:first-child {
    padding-top: 0;
    border-top: 0;
  }
  dt {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  dd {
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  dd.mono {
    ${type("code")}
  }
  dd.error {
    color: ${({ theme }) => theme.color.danger};
  }
  .ant-tag {
    margin: 0;
  }
`;

const Said = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};
  margin-top: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  blockquote {
    ${type("body")}
    margin: 0;
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fg};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

export function HandoffPanel({ handoff }: { handoff: Handoff }) {
  const status = STATUS[handoff.status];
  return (
    <Panel aria-labelledby="handoff-title">
      <PanelTitle id="handoff-title">Hand-off</PanelTitle>
      <Facts>
        <div>
          <dt>Status</dt>
          <dd>
            <Tag color={status.color} variant="filled">
              {status.label}
            </Tag>
          </dd>
        </div>
        {handoff.status === "failed" && (
          <div>
            <dt>What went wrong</dt>
            <dd className="error">
              {handoff.error || "The transfer could not be made."} The call carried on with the
              agent.
            </dd>
          </div>
        )}
        <div>
          <dt>{handoff.status === "simulated" ? "Would transfer to" : "Transferred to"}</dt>
          <dd className="mono">{handoff.to}</dd>
        </div>
        <div>
          <dt>Why</dt>
          <dd>
            {handoff.reason === "requested"
              ? "The caller asked for a person"
              : "A transfer step in the flow"}
          </dd>
        </div>
        <div>
          <dt>When</dt>
          <dd title={new Date(handoff.at).toLocaleString()}>{formatDateTime(handoff.at)}</dd>
        </div>
      </Facts>
      {handoff.summary && (
        <Said>
          <small>
            {handoff.status === "connected"
              ? "Read to the person who answered"
              : "What the person taking over would hear"}
          </small>
          <blockquote lang={isHindi(handoff.summary) ? "hi" : undefined}>
            {handoff.summary}
          </blockquote>
        </Said>
      )}
    </Panel>
  );
}
