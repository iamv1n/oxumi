"use client";

import {
  CheckOutlined,
  FormOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { FlowNode } from "@oxumi/flow-core";
import { Tooltip } from "antd";
import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { NODE_KIND, formatMs } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { Section, SidePanel, WIDE } from "./Collapsible";
import type { ConsoleLayout, LayoutKey } from "./layout";
import { type ConsoleProps, humanize, tint, ZoneHeader } from "./parts";
import { collected, type ConsoleState, formatValue, hasDevanagari, median } from "./state";

export interface LivePanelProps extends ConsoleProps {
  layout: ConsoleLayout;
  onLayout: (key: LayoutKey, open: boolean) => void;
}

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const Note = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
  line-height: 1.5;
`;

// ---- Flow progress ----------------------------------------------------------

// "stopped": where a call that was cut short had got to.
type StepState = "current" | "visited" | "upcoming" | "skipped" | "stopped";

const ring = keyframes`
  0% { box-shadow: 0 0 0 0 var(--ring); }
  70%, 100% { box-shadow: 0 0 0 7px transparent; }
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
`;

const Step = styled.li<{ $state: StepState; $colour: string }>`
  --ring: ${({ $colour }) => tint($colour, 45)};
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  min-height: 26px;
  padding: 0 ${({ theme }) => theme.space(2)};
  margin-inline: -${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.small};
  transition: background ${({ theme }) => theme.motion.base};

  /* The rail joining one step to the next. */
  &:not(:last-child)::after {
    content: "";
    position: absolute;
    left: calc(${({ theme }) => theme.space(2)} + 9.5px);
    top: calc(50% + 9px);
    width: 1px;
    height: calc(100% - 18px);
    background: ${({ theme, $state }) =>
      $state === "visited" ? theme.color.lineStrong : theme.color.line};
  }

  .dot {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    margin-inline: 1px;
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgFaint};
    font-size: 10px;
    transition:
      background ${({ theme }) => theme.motion.base},
      color ${({ theme }) => theme.motion.base},
      border-color ${({ theme }) => theme.motion.base};
  }
  .name {
    ${type("label")}
    color: ${({ theme }) => theme.color.fgSubtle};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .detail {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kind {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgFaint};
  }

  ${({ $state, $colour, theme }) =>
    $state === "visited" &&
    css`
      .dot {
        border-color: ${tint($colour, 40)};
        background: ${tint($colour, 14)};
        color: ${$colour};
      }
      .name {
        color: ${theme.color.fgMuted};
      }
      .kind {
        color: ${theme.color.fgSubtle};
      }
    `}

  ${({ $state, $colour, theme }) =>
    $state === "current" &&
    css`
      background: ${tint($colour, 10)};
      .dot {
        border-color: ${$colour};
        background: ${$colour};
        color: ${theme.color.accentFg};
        animation: ${ring} 1.8s ${theme.motion.ease} infinite;
      }
      .name {
        color: ${theme.color.fg};
      }
      .kind {
        color: ${$colour};
        font-weight: 500;
      }
    `}

  ${({ $state, $colour, theme }) =>
    $state === "stopped" &&
    css`
      .dot {
        border-color: ${$colour};
        color: ${$colour};
      }
      .name {
        color: ${theme.color.fg};
      }
      .kind {
        color: ${theme.color.fgMuted};
      }
    `}

  ${({ $state }) =>
    $state === "skipped" &&
    css`
      opacity: 0.55;
    `}
`;

function stepState(node: FlowNode, state: ConsoleState, start: string): StepState {
  const call = state.call;
  const over = state.status === "ended";
  if (!call) {
    // The server reports progress after each turn; until the first report a
    // live call is on its opening step.
    const greeting = state.status === "live" && state.lines.length > 0 && node.id === start;
    return greeting ? "current" : "upcoming";
  }
  // While live the engine rests on the step it is waiting at; once the call
  // is over every step on the path is simply done.
  if (!call.ended && call.nodeId === node.id) return over ? "stopped" : "current";
  if (call.path.includes(node.id)) return "visited";
  return over ? "skipped" : "upcoming";
}

// Progress through the flow, as numbers and as the one-line summary.
function flowProgress({ agent, state }: ConsoleProps) {
  const { nodes } = agent.flow;
  const states = nodes.map((node) => stepState(node, state, agent.flow.start));
  const done = states.filter((s) => s === "visited").length;
  const at = nodes[states.findIndex((s) => s === "current" || s === "stopped")];
  const summary = !state.call
    ? at
      ? `at ${humanize(at.id)}`
      : `${nodes.length} steps`
    : at
      ? `at ${humanize(at.id)} · ${done} of ${nodes.length} done`
      : `${done} of ${nodes.length} steps done`;
  return { states, done, total: nodes.length, summary };
}

function FlowProgress(props: LivePanelProps) {
  const { agent, state, layout, onLayout } = props;
  const { nodes } = agent.flow;
  const { states, summary } = flowProgress(props);
  return (
    <Section
      title="Flow"
      summary={summary}
      open={layout.flow}
      onToggle={() => onLayout("flow", !layout.flow)}
      tour="test-flow"
    >
      <Steps>
        {nodes.map((node, i) => {
          const kind = NODE_KIND[node.type];
          const step = states[i]!;
          const waitingOn =
            step === "current" && node.type === "ask"
              ? node.fields.filter((name) => collected(state)[name] === undefined)
              : [];
          return (
            <Step
              key={node.id}
              $state={step}
              $colour={kind.color}
              aria-current={step === "current" ? "step" : undefined}
            >
              <span className="dot">{step === "visited" ? <CheckOutlined /> : kind.icon}</span>
              <span className="name">
                {humanize(node.id)}
                {waitingOn.length > 0 && (
                  <span className="detail">waiting for {waitingOn.join(", ")}</span>
                )}
              </span>
              <span className="kind">
                {
                  {
                    current: "Now",
                    stopped: "Stopped here",
                    skipped: "Not reached",
                    visited: kind.label,
                    upcoming: kind.label,
                  }[step]
                }
              </span>
            </Step>
          );
        })}
      </Steps>
    </Section>
  );
}

// ---- Collected fields ---------------------------------------------------------

const land = keyframes`
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: none; }
`;
const flash = keyframes`
  0% { background: var(--flash); }
  100% { background: transparent; }
`;

const Fields = styled.dl`
  display: flex;
  flex-direction: column;
`;

const FieldRow = styled.div<{ $filled: boolean }>`
  --flash: ${({ theme }) => theme.color.accentSoft};
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  align-items: baseline;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2)};
  margin-inline: -${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.small};

  dt {
    ${type("code")}
    color: ${({ theme, $filled }) => ($filled ? theme.color.fgMuted : theme.color.fgSubtle)};
    cursor: help;
  }
  dd {
    ${type("label")}
    text-align: right;
    overflow-wrap: anywhere;
    color: ${({ theme, $filled }) => ($filled ? theme.color.fg : theme.color.fgFaint)};
  }
  dd[lang="hi"] {
    font-family: ${({ theme }) => theme.font.hindi};
  }

  ${({ $filled }) =>
    $filled &&
    css`
      animation: ${flash} 1.6s ease-out;
      dd {
        animation: ${land} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
      }
    `}
`;

function fieldCount({ agent, state }: ConsoleProps) {
  const values = collected(state);
  const { fields } = agent.flow;
  return {
    count: fields.filter((field) => values[field.name] !== undefined).length,
    total: fields.length,
  };
}

function CollectedFields(props: LivePanelProps) {
  const { agent, state, layout, onLayout } = props;
  const { fields } = agent.flow;
  const values = collected(state);
  const { count, total } = fieldCount(props);
  return (
    <Section
      title="Collected fields"
      summary={`${count} of ${total} collected`}
      open={layout.fields}
      onToggle={() => onLayout("fields", !layout.fields)}
      tour="test-fields"
    >
      <Fields>
        {fields.map((field) => {
          const value = values[field.name];
          const filled = value !== undefined;
          const text = filled ? formatValue(value) : "—";
          return (
            // Re-keyed when the value changes so the arrival animation replays.
            <FieldRow key={`${field.name}:${filled ? String(value) : ""}`} $filled={filled}>
              <Tooltip title={field.description} placement="left">
                <dt tabIndex={0}>{field.name}</dt>
              </Tooltip>
              <dd lang={hasDevanagari(text) ? "hi" : undefined}>
                {filled ? text : <span aria-label="Not collected yet">—</span>}
              </dd>
            </FieldRow>
          );
        })}
      </Fields>
    </Section>
  );
}

// ---- Latency ----------------------------------------------------------------

// Pinned under the scrolling sections so the headline numbers never scroll away.
const Pinned = styled.div`
  flex-shrink: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
`;

const Medians = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(2)};

  div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(2)};
  }
  div + div {
    padding-left: ${({ theme }) => theme.space(4)};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  small,
  strong {
    white-space: nowrap;
  }
  strong {
    ${type("label")}
    font-size: 0.9375rem;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.fg};
  }
  strong.none {
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

const Turns = styled.div`
  max-height: 108px;
  margin-bottom: ${({ theme }) => theme.space(2)};
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;

  th {
    ${type("caption")}
    position: sticky;
    top: 0;
    padding-bottom: ${({ theme }) => theme.space(1.5)};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 400;
    text-align: right;
  }
  td {
    ${type("label")}
    font-weight: 400;
    ${type("caption")}
    padding: ${({ theme }) => theme.space(0.75)} 0;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fg};
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  td.none {
    color: ${({ theme }) => theme.color.fgFaint};
  }
  tbody tr:last-child td {
    animation: ${land} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
`;

function latencySummary(state: ConsoleState) {
  const text = median(state.timings.map((t) => t.llmMs));
  const audio = median(state.timings.map((t) => t.audioMs));
  const summary =
    text === null && audio === null
      ? "no turns yet"
      : `median ${formatMs(text ?? audio)}${text !== null && audio !== null ? ` · audio ${formatMs(audio)}` : ""}`;
  return { text, audio, summary };
}

function Latency({ state, layout, onLayout }: LivePanelProps) {
  const { timings } = state;
  const { text, audio, summary } = latencySummary(state);
  return (
    <Section
      title="Latency"
      summary={summary}
      open={layout.latency}
      onToggle={() => onLayout("latency", !layout.latency)}
      tour="test-latency"
    >
      <Medians>
        <div>
          <small>First text</small>
          <strong className={text === null ? "none" : undefined}>{formatMs(text)}</strong>
        </div>
        <div>
          <small>First audio</small>
          <strong className={audio === null ? "none" : undefined}>{formatMs(audio)}</strong>
        </div>
      </Medians>
      {timings.length > 0 && (
        <Turns tabIndex={0} aria-label="Latency per turn">
          <Table>
            <thead>
              <tr>
                <th scope="col">Turn</th>
                <th scope="col">First text</th>
                <th scope="col">First audio</th>
              </tr>
            </thead>
            <tbody>
              {timings.map((t) => (
                <tr key={t.turn}>
                  <td>
                    {t.turn + 1}
                    {t.interrupted ? " · interrupted" : ""}
                  </td>
                  <td className={t.llmMs === null ? "none" : undefined}>{formatMs(t.llmMs)}</td>
                  <td className={t.audioMs === null ? "none" : undefined}>
                    {formatMs(t.audioMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Turns>
      )}
      <Note>
        Server-side: from the caller finishing to the agent&apos;s first text and first audio.
      </Note>
    </Section>
  );
}

// ---- The zone ------------------------------------------------------------------

const Glance = styled.span`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  border-radius: ${({ theme }) => theme.radius.control};

  .anticon {
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  @container (min-width: ${WIDE}) {
    flex-direction: column;
    gap: ${({ theme }) => theme.space(0.5)};
    margin-top: ${({ theme }) => theme.space(3)};

    .anticon {
      font-size: 15px;
    }
  }
`;

function GlanceStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <Tooltip title={label} placement="left">
      <Glance tabIndex={0} aria-label={label}>
        {icon}
        {value}
      </Glance>
    </Tooltip>
  );
}

export function LivePanel(props: LivePanelProps & { open: boolean; onToggle: () => void }) {
  const flow = flowProgress(props);
  const fields = fieldCount(props);
  const latency = latencySummary(props.state);
  const headline = latency.text ?? latency.audio;
  return (
    <SidePanel
      open={props.open}
      side="right"
      name="live state"
      label="Live state"
      width={320}
      onToggle={props.onToggle}
      slim={
        <>
          <span className="grow" />
          <GlanceStat
            icon={<NodeIndexOutlined />}
            value={`${flow.done}/${flow.total}`}
            label={`Flow: ${flow.summary}`}
          />
          <GlanceStat
            icon={<FormOutlined />}
            value={`${fields.count}/${fields.total}`}
            label={`${fields.count} of ${fields.total} fields collected`}
          />
          <GlanceStat
            icon={<ThunderboltOutlined />}
            value={headline === null ? "—" : String(headline)}
            label={`Latency: ${latency.summary}`}
          />
        </>
      }
    >
      {(toggle) => (
        <>
          <ZoneHeader>
            <h2>Live state</h2>
            <span className="grow" />
            {toggle}
          </ZoneHeader>
          <Body>
            <FlowProgress {...props} />
            <CollectedFields {...props} />
          </Body>
          <Pinned>
            <Latency {...props} />
          </Pinned>
        </>
      )}
    </SidePanel>
  );
}
