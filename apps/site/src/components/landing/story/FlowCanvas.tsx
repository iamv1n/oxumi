"use client";

import { ArrowRightOutlined, BranchesOutlined } from "@ant-design/icons";
import styled, { css, keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { glass } from "@/components/landing/kit";
import { TALL, WIDE, arrow, roundedPath, visits, type GraphLayout } from "./flow";
import type { NodeKind } from "./script";
import { SrOnly, tint } from "./shared";

// The flow builder's canvas, drawn as the product draws it: node cards
// coloured by kind, connectors with arrowheads, and a pulse walking the route
// a late trip takes. It draws itself in when the surrounding Reveal fires.

const LOOP_MS = 7600; // one trip of the pulse
const DRAWN_MS = 1700; // graph has finished drawing itself

// The step open in the inspector.
const SELECTED = "ask_delay";

const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: "start", label: "Start" },
  { kind: "say", label: "Say" },
  { kind: "ask", label: "Ask" },
  { kind: "branch", label: "Branch" },
  { kind: "end", label: "End" },
];

const DESCRIPTION =
  "Flow graph for a truck driver status check. Greeting leads to the question Where are you, " +
  "which collects current_location. Next is On schedule, which collects on_schedule. A branch " +
  "follows: if the driver is late, the flow asks for the reason and a new ETA, collecting " +
  "delay_reason and revised_eta; if on time it skips that step. Both routes continue to Need " +
  "any help, which collects needs_help, and end at Goodbye with the outcome completed.";

function Graph({ layout, compact }: { layout: GraphLayout; compact: boolean }) {
  const spans = visits(layout);
  const crop = compact && layout.id === "wide";

  return (
    <Svg
      $layout={layout.id}
      // The compact wide graph trims the empty margin above and below the nodes.
      viewBox={crop ? `0 20 ${layout.width} 250` : `0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      height={crop ? 250 : layout.height}
      aria-hidden="true"
    >
      {layout.edges.map((edge, i) => {
        const { line, head } = arrow(edge.points);
        return (
          <g key={edge.id}>
            <EdgeLine d={line} pathLength={1} $order={i} />
            <EdgeHead points={head} $order={i} />
          </g>
        );
      })}

      <Pulse $path={roundedPath(layout.pulse)}>
        <PulseHalo r={11} />
        <PulseCore r={4} />
      </Pulse>

      {layout.nodes.map((node, i) => {
        const span = spans[node.id];
        const lit = span && (
          <Lit
            as={node.kind === "branch" ? "polygon" : "rect"}
            $kind={node.kind}
            $at={span.enter}
            {...(node.kind === "branch"
              ? { points: diamond(node.x, node.y, node.w) }
              : { x: node.x, y: node.y, width: node.w, height: node.h, rx: 12 })}
          />
        );

        if (node.kind === "branch") {
          return (
            <NodeGroup key={node.id} $order={i}>
              <Diamond points={diamond(node.x, node.y, node.w)} />
              {lit}
              <BranchGlyph
                d={`M${node.x + 19} ${node.y + 34} v-6 q0 -4 4 -4 h8 m-4 -4 l4 4 l-4 4 M${node.x + 19} ${node.y + 28} v-10`}
              />
            </NodeGroup>
          );
        }
        return (
          <NodeGroup key={node.id} $order={i}>
            <Card
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              rx={12}
              $selected={!compact && node.id === SELECTED}
            />
            {lit}
            <KindDot cx={node.x + 18} cy={node.y + 19} r={3.5} $kind={node.kind} />
            <KindText x={node.x + 28} y={node.y + 23} $kind={node.kind}>
              {node.kind}
            </KindText>
            <TitleText x={node.x + 14} y={node.y + 46}>
              {node.title}
            </TitleText>
            <MetaText x={node.x + 14} y={node.y + 65}>
              {node.meta}
            </MetaText>
          </NodeGroup>
        );
      })}

      {layout.edges.map((edge, i) => (
        <Port key={edge.id} cx={edge.points[0]![0]} cy={edge.points[0]![1]} r={3.5} $order={i} />
      ))}

      {layout.edges.map(
        (edge, i) =>
          edge.label && (
            <LabelGroup key={edge.id} $order={i}>
              <LabelPill
                x={edge.label.x - edge.label.w / 2}
                y={edge.label.y - 10}
                width={edge.label.w}
                height={20}
                rx={10}
                $branch={Boolean(edge.label.branch)}
              />
              <LabelText x={edge.label.x} y={edge.label.y + 4} $branch={Boolean(edge.label.branch)}>
                {edge.label.text}
              </LabelText>
            </LabelGroup>
          ),
      )}

      <LabelGroup $order={3}>
        <CaptionText
          x={layout.branchCaption.x}
          y={layout.branchCaption.y}
          textAnchor={layout.branchCaption.anchor}
        >
          branch
        </CaptionText>
      </LabelGroup>
    </Svg>
  );
}

const diamond = (x: number, y: number, size: number) => {
  const h = size / 2;
  return `${x + h},${y} ${x + size},${y + h} ${x + h},${y + size} ${x},${y + h}`;
};

// `compact` is the home-page form: the graph alone, without the inspector or
// the engine and model strip.
export default function FlowCanvas({ compact = false }: { compact?: boolean }) {
  return (
    <Frame aria-labelledby="flow-caption">
      <Toolbar aria-hidden="true">
        <FlowIcon>
          <BranchesOutlined />
        </FlowIcon>
        <FlowName>driver-status-check</FlowName>
        <Example>Example flow</Example>
        <Legend>
          {KINDS.map(({ kind, label }) => (
            <LegendItem key={kind}>
              <LegendDot $kind={kind} />
              {label}
            </LegendItem>
          ))}
        </Legend>
      </Toolbar>

      <Canvas $compact={compact}>
        {!compact && (
          <>
        <Inspector aria-hidden="true">
            <InspectorHead>
              <InspectorKind>Ask</InspectorKind>
              <InspectorTitle>Reason + new ETA</InspectorTitle>
              <InspectorId>ask_delay</InspectorId>
            </InspectorHead>
            <InspectorRow>
              <InspectorKey>Collects</InspectorKey>
              <Chips>
                <Chip>
                  delay_reason <em>enum</em>
                </Chip>
                <Chip>
                  revised_eta <em>string</em>
                </Chip>
              </Chips>
            </InspectorRow>
            <InspectorRow>
              <InspectorKey>Guidance</InspectorKey>
              <InspectorText>
                Ask what is causing the delay and when they now expect to arrive. Do not blame the
                driver.
              </InspectorText>
            </InspectorRow>
          </Inspector>
          </>
        )}
        <Graph layout={WIDE} compact={compact} />
        <Graph layout={TALL} compact={compact} />
      </Canvas>

      <figcaption id="flow-caption">
        <SrOnly>{DESCRIPTION}</SrOnly>
        {!compact && (
          <Roles>
            <Role>
              <RoleMark $tone="engine" />
              <div>
                <RoleTitle>The flow engine decides</RoleTitle>
                <RoleText>
                  Which question comes next, which branch to take, and when the call is done. It
                  follows the drawing, every time.
                </RoleText>
              </div>
            </Role>
            <RoleArrow aria-hidden="true">
              <ArrowRightOutlined />
            </RoleArrow>
            <Role>
              <RoleMark $tone="model" />
              <div>
                <RoleTitle>The language model words it</RoleTitle>
                <RoleText>
                  It phrases each reply and proposes a value for each field. A value is kept only
                  once it passes the check for that field.
                </RoleText>
              </div>
            </Role>
          </Roles>
        )}
      </figcaption>
    </Frame>
  );
}

/* ---------- frame ---------- */

const Frame = styled.figure`
  ${glass}
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.panel};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const FlowIcon = styled.span`
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.space(7)};
  height: ${({ theme }) => theme.space(7)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentText};
  ${type("body")}
`;

const FlowName = styled.span`
  ${type("code")}
  overflow: hidden;
  color: ${({ theme }) => theme.color.fg};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Example = styled.span`
  ${type("caption")}
  flex: none;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Legend = styled.div`
  display: none;
  gap: ${({ theme }) => theme.space(4)};
  margin-left: auto;

  ${({ theme }) => theme.media.sm} {
    display: flex;
  }
`;

const LegendItem = styled.span`
  ${type("caption")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const LegendDot = styled.i<{ $kind: NodeKind }>`
  width: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $kind }) => theme.color.node[$kind]};
`;

const Canvas = styled.div<{ $compact: boolean }>`
  position: relative;
  padding: ${({ theme, $compact }) => theme.space($compact ? 4 : 5)} 0;
  background-color: ${({ theme }) => tint(theme.color.canvas, 60)};
  background-image: radial-gradient(
    ${({ theme }) => theme.color.lineStrong} 1px,
    transparent 1px
  );
  background-size: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(5)};
  background-position: center;

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme, $compact }) => theme.space($compact ? 4 : 8)} 0;
  }
`;

// The panel a builder shows for the selected step. Sits in the open corner of
// the wide graph; narrower layouts have no room for it.
const Inspector = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space(8)};
  left: ${({ theme }) => theme.space(6)};
  display: none;
  width: ${({ theme }) => theme.space(124)};
  padding: ${({ theme }) => theme.space(3.5)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => tint(theme.color.surface, 88)};
  box-shadow: ${({ theme }) => theme.shadow.node};
  opacity: 0;
  transition: opacity ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease}
    1200ms;

  [data-in="true"] & {
    opacity: 1;
  }
  ${({ theme }) => theme.media.lg} {
    display: block;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }
`;

const InspectorHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2.5)};
  padding-bottom: ${({ theme }) => theme.space(2.5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const InspectorKind = styled.span`
  ${type("overline")}
  color: ${({ theme }) => theme.color.node.ask};
`;

const InspectorTitle = styled.span`
  ${type("label")}
  font-weight: 600;
  color: ${({ theme }) => theme.color.fg};
`;

const InspectorId = styled.span`
  ${type("caption")}
  margin-left: auto;
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const InspectorRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(2.5)};
`;

const InspectorKey = styled.span`
  ${type("caption")}
  flex: none;
  width: ${({ theme }) => theme.space(16)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Chips = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const Chip = styled.span`
  ${type("caption")}
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => tint(theme.color.node.ask, 30)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => tint(theme.color.node.ask, 8)};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fg};

  em {
    font-style: normal;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const InspectorText = styled.span`
  ${type("caption")}
  line-height: ${({ theme }) => theme.text.label.line};
  color: ${({ theme }) => theme.color.fgMuted};
`;

/* ---------- graph ---------- */

const Svg = styled.svg<{ $layout: "wide" | "tall" }>`
  max-width: 100%;
  height: auto;
  margin-inline: auto;
  overflow: visible;
  display: ${({ $layout }) => ($layout === "tall" ? "block" : "none")};

  ${({ theme }) => theme.media.md} {
    display: ${({ $layout }) => ($layout === "wide" ? "block" : "none")};
  }
`;

// Hidden until the Reveal ancestor scrolls in, then eased in after a delay.
const appear = (delayMs: number) => css`
  opacity: 0;
  transition: opacity 500ms ${({ theme }) => theme.motion.ease} ${delayMs}ms;

  [data-in="true"] & {
    opacity: 1;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
  }
`;

const NodeGroup = styled.g<{ $order: number }>`
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  transform-box: fill-box;
  transform-origin: center;
  transition:
    opacity 500ms ${({ theme }) => theme.motion.ease} ${({ $order }) => $order * 140}ms,
    transform 600ms ${({ theme }) => theme.motion.ease} ${({ $order }) => $order * 140}ms;

  [data-in="true"] & {
    opacity: 1;
    transform: none;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
    transform: none;
  }
`;

const Card = styled.rect<{ $selected: boolean }>`
  fill: ${({ theme }) => theme.color.raised};
  stroke: ${({ theme, $selected }) =>
    $selected ? tint(theme.color.node.ask, 60) : theme.color.lineStrong};
  filter: drop-shadow(${({ theme }) => theme.shadow.node});
`;

const Diamond = styled.polygon`
  fill: ${({ theme }) => theme.color.raised};
  stroke: ${({ theme }) => tint(theme.color.node.branch, 70)};
  stroke-width: 1.25;
  stroke-linejoin: round;
  filter: drop-shadow(${({ theme }) => theme.shadow.node});
`;

const BranchGlyph = styled.path`
  fill: none;
  stroke: ${({ theme }) => theme.color.node.branch};
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

// The step in charge lights up for as long as the pulse is inside it.
const lit = keyframes`
  0% { opacity: 0; }
  2% { opacity: 1; }
  11% { opacity: 1; }
  17% { opacity: 0; }
  100% { opacity: 0; }
`;

const Lit = styled.rect<{ $kind: NodeKind; $at: number }>`
  fill: ${({ theme, $kind }) => tint(theme.color.node[$kind], 9)};
  stroke: ${({ theme, $kind }) => theme.color.node[$kind]};
  stroke-width: 1.5;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 10px ${({ theme, $kind }) => tint(theme.color.node[$kind], 45)});
  opacity: 0;

  [data-in="true"] & {
    animation: ${lit} ${LOOP_MS}ms linear infinite;
    animation-delay: ${({ $at }) => Math.round(DRAWN_MS + $at * LOOP_MS)}ms;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    display: none;
  }
`;

const KindDot = styled.circle<{ $kind: NodeKind }>`
  fill: ${({ theme, $kind }) => theme.color.node[$kind]};
`;

const KindText = styled.text<{ $kind: NodeKind }>`
  ${type("overline")}
  fill: ${({ theme, $kind }) => theme.color.node[$kind]};
`;

const TitleText = styled.text`
  ${type("body")}
  font-weight: 600;
  fill: ${({ theme }) => theme.color.fg};
`;

const MetaText = styled.text`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  fill: ${({ theme }) => theme.color.fgSubtle};
`;

const EdgeLine = styled.path<{ $order: number }>`
  fill: none;
  stroke: ${({ theme }) => theme.color.fgFaint};
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 600ms ${({ theme }) => theme.motion.ease}
    ${({ $order }) => 350 + $order * 140}ms;

  [data-in="true"] & {
    stroke-dashoffset: 0;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    stroke-dashoffset: 0;
  }
`;

const EdgeHead = styled.polygon<{ $order: number }>`
  fill: ${({ theme }) => theme.color.fgSubtle};
  ${({ $order }) => appear(750 + $order * 140)}
`;

const Port = styled.circle<{ $order: number }>`
  fill: ${({ theme }) => theme.color.surface};
  stroke: ${({ theme }) => theme.color.fgSubtle};
  stroke-width: 1.25;
  ${({ $order }) => appear(300 + $order * 140)}
`;

const LabelGroup = styled.g<{ $order: number }>`
  ${({ $order }) => appear(800 + $order * 140)}
`;

const LabelPill = styled.rect<{ $branch: boolean }>`
  fill: ${({ theme }) => theme.color.surface};
  stroke: ${({ theme, $branch }) =>
    $branch ? tint(theme.color.node.branch, 55) : theme.color.lineStrong};
`;

const LabelText = styled.text<{ $branch: boolean }>`
  ${type("caption")}
  font-weight: 500;
  text-anchor: middle;
  fill: ${({ theme, $branch }) => ($branch ? theme.color.node.branch : theme.color.fgMuted)};
`;

const CaptionText = styled.text`
  ${type("overline")}
  fill: ${({ theme }) => theme.color.node.branch};
`;

const travel = keyframes`
  0% { offset-distance: 0%; opacity: 0; }
  2% { opacity: 1; }
  97% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
`;

const Pulse = styled.g<{ $path: string }>`
  offset-path: path("${({ $path }) => $path}");
  offset-rotate: 0deg;
  offset-distance: 0%;
  opacity: 0;

  [data-in="true"] & {
    animation: ${travel} ${LOOP_MS}ms linear ${DRAWN_MS}ms infinite;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    display: none;
  }
`;

const PulseHalo = styled.circle`
  fill: ${({ theme }) => tint(theme.color.accent, 22)};
`;

const PulseCore = styled.circle`
  fill: ${({ theme }) => theme.color.accent};
  filter: drop-shadow(0 0 6px ${({ theme }) => theme.color.accent});
`;

/* ---------- who does what ---------- */

const Roles = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => theme.space(6)};
  }
`;

const Role = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(3.5)};
`;

const RoleMark = styled.span<{ $tone: "engine" | "model" }>`
  flex: none;
  width: 3px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) =>
    $tone === "engine" ? theme.color.accent : theme.color.violet};
`;

const RoleTitle = styled.p`
  ${type("heading")}
  color: ${({ theme }) => theme.color.fg};
`;

const RoleText = styled.p`
  ${type("body")}
  max-width: 26rem;
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

const RoleArrow = styled.span`
  display: none;
  color: ${({ theme }) => theme.color.fgFaint};
  ${type("heading")}

  ${({ theme }) => theme.media.md} {
    display: block;
  }
`;
