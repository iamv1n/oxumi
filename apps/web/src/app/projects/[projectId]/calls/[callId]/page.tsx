"use client";

import { ArrowLeftOutlined, CommentOutlined } from "@ant-design/icons";
import type { Field, FieldValue, FlowNode } from "@oxumi/flow-core";
import { Alert, Button, Skeleton } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { CallStateTag, CHANNEL, telephonyLabel } from "@/components/app/calls/CallsTable";
import { HandoffPanel } from "@/components/app/calls/HandoffPanel";
import { LatencyChart } from "@/components/app/calls/LatencyChart";
import { isHindi, Transcript } from "@/components/app/calls/Transcript";
import {
  formatDateTime,
  formatDuration,
  modelLabel,
  Page,
  Panel,
  PanelTitle,
} from "@/components/app/kit";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import { type CallDetail, useAgent, useCall } from "@/lib/api";
import { routes } from "@/lib/routes";

const GUIDE: Guide = {
  id: "call-detail",
  steps: [
    {
      target: '[data-tour="call-summary"]',
      title: "The call at a glance",
      description:
        "Which agent made the call, how it ended, whether it was by voice or text, and how long it took.",
    },
    {
      target: '[data-tour="call-transcript"]',
      title: "What was said",
      description:
        "The conversation, turn by turn. The agent is on the left and the person called is on the right. Each turn shows which step of the flow it belonged to.",
      placement: "right",
    },
    {
      target: '[data-tour="call-fields"]',
      title: "The answers collected",
      description:
        "What the agent worked out from the conversation. Anything it could not get is marked as not collected.",
      placement: "left",
    },
    {
      target: '[data-tour="call-latency"]',
      title: "How quickly the agent replied",
      description:
        "The wait after the person stopped speaking, for each turn. Shorter bars feel more natural; a long one shows where the call dragged.",
      placement: "left",
    },
  ],
};

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("label")}
  margin-bottom: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Title = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(6)};

  h1 {
    ${type("title")}
    color: ${({ theme }) => theme.color.fg};
  }
  .ant-tag {
    margin: 0;
  }
`;

const Summary = styled(Panel)`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)};
  margin-bottom: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  }
  dd.mono {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.text.code.size};
    font-weight: 400;
  }

  dt {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  dd {
    ${type("label")}
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    min-height: 24px;
    margin-top: ${({ theme }) => theme.space(1)};
    overflow: hidden;
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  dd a:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
  dd .anticon {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .ant-tag {
    margin: 0;
  }
`;

const Columns = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(6)};
  align-items: start;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
`;

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};
  min-width: 0;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};

  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
  }
`;

const Pairs = styled.dl`
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
  > div:last-child {
    padding-bottom: 0;
  }
  dt {
    ${type("code")}
    font-size: 0.75rem;
    color: ${({ theme }) => theme.color.fgMuted};
    overflow-wrap: anywhere;
  }
  dd {
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  dd.hi {
    font-family: ${({ theme }) => theme.font.hindi};
  }
  dd.missing {
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

const Bool = styled.span<{ $yes: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme, $yes }) => ($yes ? theme.color.success : theme.color.fgSubtle)};
  }
`;

const Quiet = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(4)};
  text-align: center;

  .anticon {
    margin-bottom: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgFaint};
    font-size: 28px;
  }
  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("label")}
    font-weight: 400;
    max-width: 26rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const SmallNote = styled.p`
  ${type("label")}
  font-weight: 400;
  color: ${({ theme }) => theme.color.fgSubtle};
`;

function Value({ value }: { value: FieldValue | undefined }) {
  if (value === undefined || value === "") return <>Not collected</>;
  if (typeof value === "boolean") return <Bool $yes={value}>{value ? "Yes" : "No"}</Bool>;
  return <>{String(value)}</>;
}

const valueClass = (value: FieldValue | undefined) =>
  value === undefined || value === ""
    ? "missing"
    : typeof value === "string" && isHindi(value)
      ? "hi"
      : undefined;

function CallView({ call, projectId }: { call: CallDetail; projectId: string }) {
  // The agent's flow gives field order and a look for each step. The call
  // page still works without it.
  const agent = useAgent(call.agentId);
  const flow = agent.data?.flow;

  const nodeKinds = useMemo(
    () => new Map<string, FlowNode["type"]>((flow?.nodes ?? []).map((n) => [n.id, n.type])),
    [flow],
  );

  // Fields in the flow's order, then anything collected that the flow has
  // since dropped.
  const fields = useMemo(() => {
    const defined: Pick<Field, "name">[] = flow?.fields ?? [];
    const names = [
      ...defined.map((f) => f.name),
      ...Object.keys(call.fields).filter((name) => !defined.some((f) => f.name === name)),
    ];
    return names.map((name) => ({ name, value: call.fields[name] }));
  }, [flow, call.fields]);
  const collected = fields.filter((f) => f.value !== undefined && f.value !== "").length;
  // Variables in the order the flow declares them.
  const variables = useMemo(() => {
    const order = (flow?.variables ?? []).map((v) => v.name);
    const rank = (name: string) => (order.indexOf(name) + 1 || order.length + 1);
    return Object.entries(call.variables).sort(([a], [b]) => rank(a) - rank(b));
  }, [flow, call.variables]);
  const channel = CHANNEL[call.channel];
  const metadata = Object.entries(call.metadata ?? {});

  return (
    <>
      <Title>
        <h1>Call on {formatDateTime(call.startedAt)}</h1>
      </Title>

      {call.error && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          title={`This call failed: ${call.error}`}
        />
      )}
      <Summary as="dl" aria-label="Call summary" data-tour="call-summary">
        <div>
          <dt>Agent</dt>
          <dd>
            <Link href={routes.agent(projectId, call.agentId)}>
              {call.agent?.name ?? "Deleted agent"}
            </Link>
          </dd>
        </div>
        <div>
          <dt>{call.outcome === null ? "Status" : "Outcome"}</dt>
          <dd>
            <CallStateTag call={call} />
          </dd>
        </div>
        <div>
          <dt>Channel</dt>
          <dd>
            {channel?.icon}
            {channel?.label ?? call.channel}
            {call.telephony && ` · ${telephonyLabel(call.telephony)}`}
          </dd>
        </div>
        {call.to && (
          <div>
            <dt>Number called</dt>
            <dd className="mono">{call.to}</dd>
          </div>
        )}
        <div>
          <dt>Model</dt>
          <dd title={call.model}>{modelLabel(call.model)}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd title={new Date(call.startedAt).toLocaleString()}>
            {formatDateTime(call.startedAt)}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {call.endedAt
              ? formatDuration(call.startedAt, call.endedAt)
              : call.status === "queued" || call.status === "ringing"
                ? "Not answered yet"
                : "Still running"}
          </dd>
        </div>
      </Summary>

      <Columns>
        <Panel aria-labelledby="transcript-title" data-tour="call-transcript">
          <PanelHead>
            <PanelTitle id="transcript-title">Transcript</PanelTitle>
            {call.turns.length > 0 && (
              <small>
                {call.turns.length} {call.turns.length === 1 ? "turn" : "turns"}
              </small>
            )}
          </PanelHead>
          {call.turns.length === 0 ? (
            <Quiet>
              <CommentOutlined />
              <strong>No conversation was recorded</strong>
              <p>
                {call.outcome === "failed"
                  ? (call.error ??
                    "The call failed before the agent could speak. This usually means the model or the speech service was not available.")
                  : call.status === "queued" || call.status === "ringing"
                    ? "The phone is ringing. The conversation appears here once the person picks up."
                    : call.outcome === null
                      ? "The call has started but nothing has been said yet."
                    : "The call ended before the first turn."}
              </p>
            </Quiet>
          ) : (
            <Transcript turns={call.turns} nodeKinds={nodeKinds} />
          )}
        </Panel>

        <Side>
          {call.handoff && <HandoffPanel handoff={call.handoff} />}

          <Panel aria-labelledby="fields-title" data-tour="call-fields">
            <PanelHead>
              <PanelTitle id="fields-title">Collected fields</PanelTitle>
              {fields.length > 0 && (
                <small>
                  {collected} of {fields.length}
                </small>
              )}
            </PanelHead>
            {fields.length === 0 ? (
              agent.isLoading ? (
                <Skeleton active title={false} paragraph={{ rows: 3 }} />
              ) : (
                <SmallNote>Nothing was collected on this call.</SmallNote>
              )
            ) : (
              <Pairs>
                {fields.map(({ name, value }) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd className={valueClass(value)}>
                      <Value value={value} />
                    </dd>
                  </div>
                ))}
              </Pairs>
            )}
          </Panel>

          <Panel aria-labelledby="variables-title">
            <PanelTitle id="variables-title">Variables used</PanelTitle>
            {variables.length === 0 ? (
              <SmallNote>This call was started without variables.</SmallNote>
            ) : (
              <Pairs>
                {variables.map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd className={valueClass(value)}>
                      <Value value={value} />
                    </dd>
                  </div>
                ))}
              </Pairs>
            )}
          </Panel>

          {metadata.length > 0 && (
            <Panel aria-labelledby="metadata-title">
              <PanelTitle id="metadata-title">Metadata</PanelTitle>
              <SmallNote style={{ marginBottom: 12 }}>
                Sent by your software with the API request and returned unchanged in the webhook.
              </SmallNote>
              <Pairs>
                {metadata.map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </Pairs>
            </Panel>
          )}

          <Panel aria-labelledby="latency-title" data-tour="call-latency">
            <PanelTitle id="latency-title">Reply latency</PanelTitle>
            {call.turns.length === 0 ? (
              <SmallNote>No turns, so nothing was timed.</SmallNote>
            ) : (
              <LatencyChart turns={call.turns} />
            )}
          </Panel>
        </Side>
      </Columns>
    </>
  );
}

function CallSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading call">
      <Skeleton active title={{ width: 260 }} paragraph={false} style={{ marginBottom: 24 }} />
      <Panel style={{ marginBottom: 24 }}>
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </Panel>
      <Columns>
        <Panel>
          <Skeleton active title={{ width: 120 }} paragraph={{ rows: 9 }} />
        </Panel>
        <Side>
          <Panel>
            <Skeleton active title={{ width: 140 }} paragraph={{ rows: 5 }} />
          </Panel>
          <Panel>
            <Skeleton active title={{ width: 140 }} paragraph={{ rows: 3 }} />
          </Panel>
        </Side>
      </Columns>
    </div>
  );
}

export default function CallPage() {
  const { projectId, callId } = useParams<{ projectId: string; callId: string }>();
  const call = useCall(callId);
  usePageGuide(GUIDE);
  const missing = call.error?.status === 404;

  return (
    <Page>
      <Back href={routes.calls(projectId)}>
        <ArrowLeftOutlined /> All calls
      </Back>
      {call.data ? (
        <CallView call={call.data} projectId={projectId} />
      ) : call.error ? (
        <LoadError
          title={missing ? "This call does not exist" : "The call could not be loaded"}
          error={
            missing
              ? { message: "It may have been removed along with its agent." }
              : call.error
          }
          onRetry={missing ? undefined : () => call.mutate()}
          action={
            <Link href={routes.calls(projectId)}>
              <Button>Back to calls</Button>
            </Link>
          }
        />
      ) : (
        <CallSkeleton />
      )}
    </Page>
  );
}
