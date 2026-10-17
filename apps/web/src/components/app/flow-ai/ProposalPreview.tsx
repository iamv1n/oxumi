"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import type { DraftFlow, FlowNode } from "@oxumi/flow-core";
import { Alert, Tag } from "antd";
import styled from "styled-components";
import { Mono, NODE_KIND } from "@/components/app/kit";
import { conditionText, OUTCOME_LABEL, stableJson } from "@/components/app/flow-builder/model";
import { type } from "@oxumi/ui/design/typography";
import type { FlowProposal } from "@/lib/api";

// A written-out reading of a proposed flow: what it collects, then every step
// in order with what it says or asks and where it goes. Given the flow it
// would replace, it marks what is new, changed or gone.

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};

  h3 {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};

  .ant-tag {
    margin: 0;
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Step = styled.li<{ $color: string; $mark?: "new" | "changed" }>`
  display: grid;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
  border: 1px solid
    ${({ theme, $mark }) =>
      $mark === "new" ? theme.color.success : $mark === "changed" ? theme.color.info : theme.color.line};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.surface};

  .head {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    min-width: 0;
    ${type("label")}
  }
  .kind {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    color: ${({ $color }) => $color};
    font-weight: 600;
  }
  .id {
    color: ${({ theme }) => theme.color.fgSubtle};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .head .ant-tag {
    margin: 0 0 0 auto;
  }
  p {
    ${type("body")}
    color: ${({ theme }) => theme.color.fg};
  }
  .route {
    ${type("caption")}
    display: grid;
    gap: 2px;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .route .anticon {
    margin-inline: ${({ theme }) => theme.space(1)};
    font-size: 10px;
  }
`;

const Removed = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.danger};
`;

function text(node: FlowNode, fields: DraftFlow["fields"]): string {
  switch (node.type) {
    case "ask": {
      const asked = node.fields
        .map((name) => fields.find((f) => f.name === name)?.description ?? name)
        .join("; ");
      return node.guidance ? `${asked}. ${node.guidance}` : asked;
    }
    case "branch":
      return "";
    default:
      return node.say;
  }
}

function routes(node: FlowNode): { label: string; to: string }[] {
  switch (node.type) {
    case "branch":
      return [
        ...node.branches.map((b) => ({ label: `If ${conditionText(b.when)}`, to: b.next })),
        { label: "Otherwise", to: node.default },
      ];
    case "end":
      return [{ label: "Ends", to: OUTCOME_LABEL[node.outcome] ?? node.outcome }];
    case "transfer":
      return [
        { label: `Transfers to ${node.to}; if nobody answers`, to: node.next },
      ];
    default:
      return [{ label: "Then", to: node.next }];
  }
}

export function ProposalPreview({
  proposal,
  previous,
}: {
  proposal: FlowProposal;
  // The flow this would replace, to mark the differences.
  previous?: DraftFlow;
}) {
  const { flow, issues } = proposal;
  const before = new Map(previous?.nodes.map((n) => [n.id, stableJson(n)]));
  const removed = previous
    ? previous.nodes.filter((n) => !flow.nodes.some((m) => m.id === n.id)).map((n) => n.id)
    : [];
  const mark = (node: FlowNode) =>
    !previous
      ? undefined
      : !before.has(node.id)
        ? ("new" as const)
        : before.get(node.id) !== stableJson(node)
          ? ("changed" as const)
          : undefined;
  const errors = issues.filter((i) => i.level === "error");

  return (
    <>
      <Alert
        type={proposal.valid ? "success" : "warning"}
        showIcon
        title={proposal.valid ? "Ready to apply" : "Needs a fix after applying"}
        description={
          <>
            {proposal.summary}
            {!proposal.valid && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {errors.map((e) => (
                  <li key={e.message}>{e.message}</li>
                ))}
              </ul>
            )}
          </>
        }
      />

      <Section>
        <h3>Collects</h3>
        <Tags>
          {flow.fields.map((f) => (
            <Tag key={f.name} title={f.description}>
              {f.name.replace(/_/g, " ")}
              {f.type === "enum" && f.options ? `: ${f.options.join(" / ")}` : ` (${f.type})`}
              {f.required === false && " · optional"}
            </Tag>
          ))}
        </Tags>
        {flow.variables.length > 0 && (
          <>
            <h3>Needs before each call</h3>
            <Tags>
              {flow.variables.map((v) => (
                <Tag key={v.name} variant="filled" title={v.description}>
                  {`{{${v.name}}}`}
                  {v.example ? ` e.g. ${v.example}` : ""}
                </Tag>
              ))}
            </Tags>
          </>
        )}
      </Section>

      <Section>
        <h3>
          {flow.nodes.length} steps
          {previous && removed.length > 0 && ` · ${removed.length} removed`}
        </h3>
        <Steps>
          {flow.nodes.map((node) => {
            const kind = NODE_KIND[node.type];
            const m = mark(node);
            const body = text(node, flow.fields);
            return (
              <Step key={node.id} $color={kind.color} $mark={m}>
                <div className="head">
                  <span className="kind">
                    {kind.icon} {kind.label}
                  </span>
                  <Mono className="id">{node.id}</Mono>
                  {m && <Tag color={m === "new" ? "success" : "processing"}>{m === "new" ? "New" : "Changed"}</Tag>}
                </div>
                {body && <p>{body}</p>}
                <div className="route">
                  {routes(node).map((r) => (
                    <span key={r.label}>
                      {r.label}
                      <ArrowRightOutlined aria-label="goes to" />
                      <Mono>{r.to || "not connected"}</Mono>
                    </span>
                  ))}
                </div>
              </Step>
            );
          })}
        </Steps>
        {removed.length > 0 && <Removed>Removed: {removed.join(", ")}</Removed>}
      </Section>
    </>
  );
}
