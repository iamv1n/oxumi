"use client";

import { CheckOutlined } from "@ant-design/icons";
import styled, { css, keyframes } from "styled-components";
import { Inset, InsetHead } from "./parts";

// The product in one small picture: a call walks the driver status flow, and
// each answer lands in a typed field as its step is passed. It only runs
// while the panel is open, and stands still (complete) under reduced motion.

type Kind = "start" | "ask" | "branch" | "end";

const W = 468;
const H = 104;
const NODE_H = 30;
const ROW = 62;
const MID = ROW + NODE_H / 2;

const NODES: { id: string; kind: Kind; title: string; x: number; y: number; w: number }[] = [
  { id: "greeting", kind: "start", title: "Greeting", x: 1, y: ROW, w: 78 },
  { id: "location", kind: "ask", title: "Where are you?", x: 99, y: ROW, w: 112 },
  { id: "schedule", kind: "ask", title: "On schedule?", x: 231, y: ROW, w: 102 },
  { id: "late", kind: "branch", title: "", x: 353, y: MID, w: 22 },
  { id: "delay", kind: "ask", title: "Reason + new ETA", x: 300, y: 4, w: 128 },
  { id: "goodbye", kind: "end", title: "Goodbye", x: 391, y: ROW, w: 76 },
];

// Straight runs between the steps, in the order the call takes them.
const EDGES = [
  "M79 77 H99",
  "M211 77 H231",
  "M333 77 H353",
  "M364 66 V34",
  "M414 34 V62",
  "M375 77 H391",
];

const FIELDS = [
  { name: "current_location", value: "Near Vadodara toll", at: 1 },
  { name: "on_schedule", value: "false", at: 2 },
  { name: "revised_eta", value: "9:40 pm", at: 4 },
] as const;

// One pass of the call, and how long it dwells on each step.
const LOOP = 9;
const STEP = 1.25;

const lit = keyframes`
  0% { opacity: 0; }
  3%, 13% { opacity: 1; }
  19%, 100% { opacity: 0; }
`;

const land = keyframes`
  0% { opacity: 0; transform: translateY(3px); }
  4%, 95% { opacity: 1; transform: none; }
  100% { opacity: 0; transform: none; }
`;

const running = css`
  animation-play-state: paused;
  [data-open="true"] & {
    animation-play-state: running;
  }
`;

const Svg = styled.svg`
  display: block;
  width: ${W}px;
  max-width: 100%;
  height: auto;
  margin: ${({ theme }) => theme.space(5)} auto;
  overflow: visible;

  .edge {
    fill: none;
    stroke: ${({ theme }) => theme.color.lineStrong};
  }
  .box {
    fill: ${({ theme }) => theme.color.elevated};
    stroke: ${({ theme }) => theme.color.lineStrong};
  }
  .ring {
    fill: none;
    stroke-width: 1.5;
    opacity: 0;
    animation: ${lit} ${LOOP}s linear infinite both;
    ${running}
  }
  .dot {
    stroke: none;
  }
  text {
    fill: ${({ theme }) => theme.color.fgMuted};
    font-family: ${({ theme }) => theme.font.sans};
    font-size: 11px;
    font-weight: 500;
  }
  .hint {
    fill: ${({ theme }) => theme.color.fgSubtle};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 10px;
    font-weight: 400;
  }
  ${(["start", "ask", "branch", "end"] as const).map(
    (kind) => css`
      .${kind} .ring {
        stroke: ${({ theme }) => theme.color.node[kind]};
      }
      .${kind} .dot {
        fill: ${({ theme }) => theme.color.node[kind]};
      }
    `,
  )}

  ${({ theme }) => theme.media.reducedMotion} {
    .ring {
      animation: none;
    }
  }
`;

// Graph and fields side by side while there is room; the fields drop below,
// three across, when there is not.
const Body = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: ${({ theme }) => theme.color.line};
  border-radius: 0 0 ${({ theme }) => theme.radius.card} ${({ theme }) => theme.radius.card};
  overflow: hidden;

  > * {
    background: ${({ theme }) => theme.color.canvas};
  }
`;

const Graph = styled.div`
  flex: 1 1 ${W + 32}px;
  min-width: 0;
  padding-inline: ${({ theme }) => theme.space(4)};
`;

const Fields = styled.dl`
  display: grid;
  flex: 1 1 ${({ theme }) => theme.space(50)};
  grid-template-columns: repeat(auto-fit, minmax(${({ theme }) => theme.space(36)}, 1fr));
  gap: 1px;
  background: ${({ theme }) => theme.color.line};

  div {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    min-height: ${({ theme }) => theme.space(13)};
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    background: ${({ theme }) => theme.color.canvas};
  }
  dt {
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 11px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  dd {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
    margin-top: 2px;
    color: ${({ theme }) => theme.color.fg};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
    opacity: 0;
    animation: ${land} ${LOOP}s linear infinite both;
    ${running}
  }
  .anticon {
    color: ${({ theme }) => theme.color.success};
    font-size: 10px;
  }

  ${({ theme }) => theme.media.reducedMotion} {
    dd {
      opacity: 1;
      animation: none;
    }
  }
`;

export default function MiniFlow() {
  return (
    <Inset aria-hidden>
      <InsetHead>
        <b>Driver status check</b>
        <span>flow → fields</span>
      </InsetHead>
      <Body>
        <Graph>
          <Svg viewBox={`0 0 ${W} ${H}`} focusable="false">
        {EDGES.map((d) => (
          <path key={d} className="edge" d={d} />
        ))}
        <text className="hint" x={370} y={52}>
          late
        </text>
        {NODES.map((node, order) => {
          const delay = { animationDelay: `${order * STEP}s` };
          if (node.kind === "branch") {
            const points = `${node.x} ${node.y} ${node.x + 11} ${node.y - 11} ${node.x + 22} ${node.y} ${node.x + 11} ${node.y + 11}`;
            return (
              <g key={node.id} className="branch">
                <polygon className="box" points={points} />
                <polygon className="ring" points={points} style={delay} />
              </g>
            );
          }
          return (
            <g key={node.id} className={node.kind}>
              <rect className="box" x={node.x} y={node.y} width={node.w} height={NODE_H} rx={6} />
              <rect
                className="ring"
                x={node.x}
                y={node.y}
                width={node.w}
                height={NODE_H}
                rx={6}
                style={delay}
              />
              <circle className="dot" cx={node.x + 12} cy={node.y + NODE_H / 2} r={3} />
              <text x={node.x + 21} y={node.y + NODE_H / 2 + 4}>
                {node.title}
              </text>
            </g>
          );
        })}
          </Svg>
        </Graph>
        <Fields>
        {FIELDS.map((field) => (
          <div key={field.name}>
            <dt>{field.name}</dt>
            {/* The value lands as the call leaves the step that asked for it. */}
            <dd style={{ animationDelay: `${(field.at + 0.8) * STEP}s` }}>
              {field.value}
              <CheckOutlined />
            </dd>
          </div>
        ))}
        </Fields>
      </Body>
    </Inset>
  );
}
