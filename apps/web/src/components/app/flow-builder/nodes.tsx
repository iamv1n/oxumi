"use client";

import { ExclamationCircleFilled, WarningFilled } from "@ant-design/icons";
import type { Field, FlowNode } from "@oxumi/flow-core";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Tooltip } from "antd";
import { createContext, memo, type ReactNode, useContext } from "react";
import styled, { css } from "styled-components";
import { NODE_KIND, OutcomeTag } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import {
  branchHandle,
  conditionParts,
  DEFAULT_HANDLE,
  NEXT_HANDLE,
  NODE_WIDTH,
  type NodeIssue,
} from "./model";

export type StepNode = Node<{ node: FlowNode }, "step">;

// Flow-wide facts a node needs to draw itself, kept out of node data so a
// node only re-renders for its own changes or when these change.
export interface CanvasFacts {
  fields: Map<string, Field>;
  issues: Map<string, NodeIssue[]>;
  // Nodes the onboarding guide points at: one output handle, one branch.
  tour: { output: string | null; branch: string | null };
}
export const CanvasFactsContext = createContext<CanvasFacts>({
  fields: new Map(),
  issues: new Map(),
  tour: { output: null, branch: null },
});

// ---- Pieces ---------------------------------------------------------------

const Card = styled.div<{ $tone: string; $selected: boolean; $level?: "error" | "warning" }>`
  --tone: ${({ $tone }) => $tone};
  position: relative;
  width: ${NODE_WIDTH}px;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.node};
  transition:
    border-color ${({ theme }) => theme.motion.fast},
    box-shadow ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: color-mix(in srgb, var(--tone) 55%, transparent);
  }

  ${({ $level, theme }) =>
    $level === "error" &&
    css`
      border-color: color-mix(in srgb, ${theme.color.danger} 70%, transparent);
      &:hover {
        border-color: ${theme.color.danger};
      }
    `}

  ${({ $selected, theme }) =>
    $selected &&
    css`
      &,
      &:hover {
        border-color: var(--tone);
      }
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--tone) 28%, transparent),
        ${theme.shadow.node};
    `}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const KindIcon = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.control};
  background: color-mix(in srgb, var(--tone) 16%, transparent);
  color: var(--tone);
  font-size: 15px;
`;

const Titles = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  small {
    ${type("overline")}
    font-size: 0.625rem;
    line-height: 0.875rem;
    color: var(--tone);
  }
  strong {
    ${type("code")}
    font-weight: 500;
    line-height: 1.125rem;
    color: ${({ theme }) => theme.color.fg};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const IssueMark = styled.span<{ $level: "error" | "warning" }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $level }) =>
    $level === "error" ? theme.color.dangerSoft : theme.color.warningSoft};
  color: ${({ theme, $level }) => ($level === "error" ? theme.color.danger : theme.color.warning)};
  font-size: 13px;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)};
`;

const Line = styled.p<{ $lines?: number; $muted?: boolean }>`
  ${type("label")}
  font-weight: 400;
  line-height: 1.25rem;
  color: ${({ theme, $muted }) => ($muted ? theme.color.fgMuted : theme.color.fg)};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${({ $lines = 3 }) => $lines};
  overflow: hidden;
  overflow-wrap: anywhere;
`;

const Placeholder = styled.p`
  ${type("label")}
  font-weight: 400;
  font-style: italic;
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Variable = styled.span`
  ${type("code")}
  font-size: 0.75rem;
  padding: 0 ${({ theme }) => theme.space(1)};
  border-radius: calc(${({ theme }) => theme.radius.control} / 2);
  background: ${({ theme }) => theme.color.hover};
  color: ${({ theme }) => theme.color.accentText};
  white-space: nowrap;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const Chip = styled.span<{ $unknown?: boolean }>`
  ${type("code")}
  font-size: 0.75rem;
  line-height: 1.375rem;
  max-width: 100%;
  padding: 0 ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $unknown }) =>
      $unknown ? theme.color.danger : "color-mix(in srgb, var(--tone) 40%, transparent)"};
  background: ${({ theme, $unknown }) =>
    $unknown ? theme.color.dangerSoft : "color-mix(in srgb, var(--tone) 10%, transparent)"};
  color: ${({ theme, $unknown }) => ($unknown ? theme.color.danger : theme.color.fg)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(1)} 0;
`;

const Row = styled.div<{ $open: boolean }>`
  position: relative;
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(1.5)};
  min-height: 36px;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(5)}
    ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  ${type("label")}
  font-weight: 400;
  color: ${({ theme }) => theme.color.fgMuted};

  & + & {
    border-top: 1px dashed ${({ theme }) => theme.color.line};
  }
  em {
    flex: none;
    font-style: normal;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  b {
    ${type("code")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
  i {
    font-style: normal;
    font-weight: 500;
    color: var(--tone);
  }
`;

// A transfer's single way out sits on its own row, like a branch's.
const Fallback = styled(Rows)`
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  .ant-tag {
    margin: 0;
  }
`;

// Spoken text with its {{variables}} picked out.
export function Spoken({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*[a-z][a-z0-9_]*\s*\}\})/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? <Variable key={i}>{part.replace(/[{}\s]/g, "")}</Variable> : part,
      )}
    </>
  );
}

function Out({ id, connected, tour }: { id: string; connected: boolean; tour?: boolean }) {
  return (
    <Handle
      type="source"
      position={Position.Right}
      id={id}
      className={connected ? "is-connected" : "is-open"}
      data-tour={tour ? "builder-output" : undefined}
    />
  );
}

// ---- The node -------------------------------------------------------------

function summary(node: FlowNode, fields: Map<string, Field>, tour: boolean): ReactNode {
  switch (node.type) {
    case "start":
    case "say":
      return (
        <Body>
          {node.say ? (
            <Line>
              <Spoken text={node.say} />
            </Line>
          ) : (
            <Placeholder>Nothing to say yet</Placeholder>
          )}
        </Body>
      );
    case "ask":
      return (
        <Body>
          {node.fields.length ? (
            <Chips>
              {node.fields.map((name) => (
                <Chip key={name} $unknown={!fields.has(name)}>
                  {name}
                </Chip>
              ))}
            </Chips>
          ) : (
            <Placeholder>No fields chosen yet</Placeholder>
          )}
          {node.guidance && (
            <Line $lines={2} $muted>
              <Spoken text={node.guidance} />
            </Line>
          )}
        </Body>
      );
    case "branch":
      return (
        <Rows>
          {node.branches.map((branch, i) => {
            const { field, op, value } = conditionParts(branch.when);
            return (
              <Row key={i} $open={!branch.next}>
                <em>if</em>
                <span>
                  <b>{field}</b> {op} {value && <i>{value}</i>}
                </span>
                <Out id={branchHandle(i)} connected={!!branch.next} />
              </Row>
            );
          })}
          <Row $open={!node.default}>
            {/* A branch is entered level with its "otherwise" output, so the
                line a path continues on runs straight through it. */}
            <Handle type="target" position={Position.Left} />
            <em>otherwise</em>
            <Out id={DEFAULT_HANDLE} connected={!!node.default} />
          </Row>
        </Rows>
      );
    case "transfer":
      return (
        <>
          <Body>
            {node.say ? (
              <Line $lines={2}>
                <Spoken text={node.say} />
              </Line>
            ) : (
              <Placeholder>Nothing to say yet</Placeholder>
            )}
            <Footer>
              <span>Transfers to</span>
              {!node.to ? (
                <Placeholder>No number yet</Placeholder>
              ) : node.to.includes("{{") ? (
                <span>
                  <Spoken text={node.to.trim()} />
                </span>
              ) : (
                <Chip>{node.to}</Chip>
              )}
            </Footer>
          </Body>
          <Fallback>
            <Row $open={!node.next}>
              {/* Entered level with its one output, so the line a path
                  continues on runs straight through it. */}
              <Handle type="target" position={Position.Left} />
              <em>If no one can take it</em>
              <Out id={NEXT_HANDLE} connected={!!node.next} tour={tour} />
            </Row>
          </Fallback>
        </>
      );
    case "end":
      return (
        <Body>
          {node.say ? (
            <Line>
              <Spoken text={node.say} />
            </Line>
          ) : (
            <Placeholder>No closing line yet</Placeholder>
          )}
          <Footer>
            <span>Call outcome</span>
            <OutcomeTag outcome={node.outcome} />
          </Footer>
        </Body>
      );
  }
}

export const StepNodeView = memo(function StepNodeView({ data, selected }: NodeProps<StepNode>) {
  const { node } = data;
  const { fields, issues, tour } = useContext(CanvasFactsContext);
  const kind = NODE_KIND[node.type];
  const mine = issues.get(node.id);
  const level = mine?.some((i) => i.level === "error") ? "error" : mine?.length ? "warning" : undefined;

  return (
    <Card
      $tone={kind.color}
      $selected={!!selected}
      $level={level}
      data-tour={tour.branch === node.id ? "builder-branch" : undefined}
    >
      {node.type !== "start" && node.type !== "branch" && node.type !== "transfer" && (
        <Handle type="target" position={Position.Left} />
      )}
      <Header>
        <KindIcon>{kind.icon}</KindIcon>
        <Titles>
          <small>{kind.label}</small>
          <strong>{node.id}</strong>
        </Titles>
        {mine && level && (
          <Tooltip
            title={mine.map((issue, i) => (
              <div key={i}>{issue.text}</div>
            ))}
          >
            <IssueMark $level={level} aria-label={`${mine.length} issue${mine.length > 1 ? "s" : ""}`}>
              {level === "error" ? <ExclamationCircleFilled /> : <WarningFilled />}
            </IssueMark>
          </Tooltip>
        )}
      </Header>
      {summary(node, fields, tour.output === node.id)}
      {node.type !== "branch" && node.type !== "end" && node.type !== "transfer" && (
        <Out id={NEXT_HANDLE} connected={!!node.next} tour={tour.output === node.id} />
      )}
    </Card>
  );
});

export const nodeTypes = { step: StepNodeView };
