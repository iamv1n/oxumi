"use client";

import styled, { css, keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { NodeKind } from "./scenarios";
import { tint } from "./shared";

// Small looping illustrations for Design, Call and Collect. Each loop ends on
// its finished state, so reduced-motion visitors see the assembled picture.

const LOOP = "9s";

const Art = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 8 / 5;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background-color: ${({ theme }) => theme.color.surface};
  background-image: radial-gradient(${({ theme }) => theme.color.line} 1px, transparent 1px);
  background-size: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(4)};
`;

/* ---------- Design: a step is dragged in and wired up ---------- */

const dragIn = keyframes`
  0% { transform: translate(-70px, 66px); opacity: 0; }
  6% { transform: translate(-70px, 66px); opacity: 1; }
  14% { transform: translate(-70px, 66px); }
  38% { transform: translate(0, 0); }
  100% { transform: translate(0, 0); opacity: 1; }
`;

const cursorOut = keyframes`
  0%, 40% { opacity: 1; transform: translate(0, 0); }
  52%, 100% { opacity: 0; transform: translate(30px, 26px); }
`;

const slotOut = keyframes`
  0% { opacity: 0; }
  8%, 30% { opacity: 1; }
  40%, 100% { opacity: 0; }
`;

const wire = (from: number, to: number) => keyframes`
  0%, ${from}% { stroke-dashoffset: 1; }
  ${to}%, 100% { stroke-dashoffset: 0; }
`;

const popAt = (from: number) => keyframes`
  0%, ${from}% { opacity: 0; transform: scale(0.8); }
  ${from + 6}%, 100% { opacity: 1; transform: scale(1); }
`;

const loop = (name: ReturnType<typeof keyframes>) => css`
  animation: ${name} ${LOOP} ${({ theme }) => theme.motion.ease} infinite;
`;

const Svg = styled.svg`
  width: 100%;
  height: 100%;
`;

const NodeRect = styled.rect<{ $selected?: boolean }>`
  fill: ${({ theme }) => theme.color.raised};
  stroke: ${({ theme, $selected }) =>
    $selected ? tint(theme.color.node.ask, 70) : theme.color.lineStrong};
`;

const NodeKindText = styled.text<{ $kind: NodeKind }>`
  ${type("overline")}
  fill: ${({ theme, $kind }) => theme.color.node[$kind]};
`;

const NodeTitle = styled.text`
  ${type("label")}
  font-weight: 600;
  fill: ${({ theme }) => theme.color.fg};
`;

const Dragged = styled.g`
  ${loop(dragIn)}
`;

const Cursor = styled.path`
  fill: ${({ theme }) => theme.color.fg};
  stroke: ${({ theme }) => theme.color.canvas};
  stroke-width: 1;
  ${loop(cursorOut)}
`;

const DropSlot = styled.rect`
  fill: none;
  stroke: ${({ theme }) => tint(theme.color.node.ask, 60)};
  stroke-dasharray: 4 4;
  ${loop(slotOut)}
`;

const Wire = styled.path<{ $from: number; $to: number }>`
  fill: none;
  stroke: ${({ theme }) => theme.color.fgSubtle};
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-dasharray: 1;
  ${({ $from, $to }) => loop(wire($from, $to))}
`;

const WireHead = styled.polygon<{ $at: number }>`
  fill: ${({ theme }) => theme.color.fgSubtle};
  transform-box: fill-box;
  transform-origin: center;
  ${({ $at }) => loop(popAt($at))}
`;

const Collects = styled.g`
  transform-box: fill-box;
  transform-origin: center;
  ${loop(popAt(66))}
`;

const CollectsPill = styled.rect`
  fill: ${({ theme }) => tint(theme.color.node.ask, 12)};
  stroke: ${({ theme }) => tint(theme.color.node.ask, 45)};
`;

const CollectsText = styled.text`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  fill: ${({ theme }) => theme.color.fg};
`;

function MiniNode(props: { x: number; y: number; kind: NodeKind; title: string; sel?: boolean }) {
  return (
    <>
      <NodeRect x={props.x} y={props.y} width={116} height={44} rx={9} $selected={props.sel} />
      <NodeKindText x={props.x + 12} y={props.y + 17} $kind={props.kind}>
        {props.kind}
      </NodeKindText>
      <NodeTitle x={props.x + 12} y={props.y + 33}>
        {props.title}
      </NodeTitle>
    </>
  );
}

export function DesignArt() {
  return (
    <Art aria-hidden="true">
      <Svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet">
        <Wire d="M74 62 V88 Q74 98 84 98 H96" pathLength={1} $from={42} $to={52} />
        <WireHead points="102,98 95,94 95,102" $at={50} />
        <Wire d="M218 98 H236 Q246 98 246 108 V126" pathLength={1} $from={52} $to={62} />
        <WireHead points="246,133 242,126 250,126" $at={60} />

        <MiniNode x={16} y={18} kind="ask" title="On schedule?" />
        <MiniNode x={188} y={136} kind="end" title="Goodbye" />

        <DropSlot x={102} y={76} width={116} height={44} rx={9} />
        <Dragged>
          <MiniNode x={102} y={76} kind="ask" title="New ETA" sel />
          <Cursor d="M196 104 l0 17 l4.5 -4 l3 7 l3 -1.3 l-3 -7 l6 0 z" />
        </Dragged>

        <Collects>
          <CollectsPill x={16} y={158} width={166} height={24} rx={12} />
          <CollectsText x={28} y={174}>
            collects revised_eta
          </CollectsText>
        </Collects>
      </Svg>
    </Art>
  );
}

/* ---------- Call: one flow, tested in the browser, then on a phone ---------- */

const browserOn = keyframes`
  0%, 44% { opacity: 1; }
  52%, 100% { opacity: 0.55; }
`;

const phoneOn = keyframes`
  0%, 44% { opacity: 0.55; }
  52%, 100% { opacity: 1; }
`;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

const CallStage = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto 1fr;
  align-items: end;
  gap: 0 ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(4)};
`;

const FlowChip = styled.div`
  ${type("caption")}
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-self: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => tint(theme.color.accent, 45)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.raised};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fg};
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    height: ${({ theme }) => theme.space(2)};
    border-left: 1px dashed ${({ theme }) => tint(theme.color.accent, 60)};
  }
  &::before {
    content: "";
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
  }
`;

// Dashed line from the flow down to both places it runs.
const Bus = styled.span`
  grid-column: 1 / -1;
  height: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(2)};
  margin-right: ${({ theme }) => theme.space(11)};
  margin-left: calc((100% - ${({ theme }) => theme.space(27)}) / 2);
  border: 1px dashed ${({ theme }) => tint(theme.color.accent, 60)};
  border-bottom: 0;
  border-radius: ${({ theme }) => theme.radius.control} ${({ theme }) => theme.radius.control} 0 0;
`;

const Browser = styled.div`
  align-self: stretch;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
  animation: ${browserOn} ${LOOP} linear infinite;
`;

const BrowserBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  i {
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.lineStrong};
  }
  span {
    ${type("caption")}
    margin-left: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const DeviceBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(2)};
`;

const DeviceLabel = styled.span`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
`;

const MiniWave = styled.span<{ $tone: "accent" | "success" }>`
  display: flex;
  align-items: center;
  gap: 2px;
  height: ${({ theme }) => theme.space(6)};
  color: ${({ theme, $tone }) => theme.color[$tone]};

  i {
    width: 2px;
    height: 100%;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: currentColor;
    animation: ${bounce} 900ms ease-in-out infinite;
  }
`;

const Phone = styled.div`
  width: ${({ theme }) => theme.space(22)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.raised};
  animation: ${phoneOn} ${LOOP} linear infinite;

  &::before {
    content: "";
    display: block;
    width: ${({ theme }) => theme.space(6)};
    height: ${({ theme }) => theme.space(1)};
    margin: ${({ theme }) => theme.space(2)} auto 0;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.lineStrong};
  }
`;

const WAVE = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.6, 0.8, 0.45];

function Bars({ tone, count }: { tone: "accent" | "success"; count: number }) {
  return (
    <MiniWave $tone={tone}>
      {WAVE.slice(0, count).map((h, i) => (
        <i key={i} style={{ height: `${h * 100}%`, animationDelay: `${i * -130}ms` }} />
      ))}
    </MiniWave>
  );
}

export function CallArt() {
  return (
    <Art aria-hidden="true">
      <CallStage>
        <FlowChip>driver-status-check</FlowChip>
        <Bus />
        <Browser>
          <BrowserBar>
            <i />
            <i />
            <i />
            <span>Test call</span>
          </BrowserBar>
          <DeviceBody>
            <Bars tone="accent" count={12} />
            <DeviceLabel>In your browser</DeviceLabel>
          </DeviceBody>
        </Browser>
        <Phone>
          <DeviceBody>
            <Bars tone="success" count={7} />
            <DeviceLabel>On a phone</DeviceLabel>
          </DeviceBody>
        </Phone>
      </CallStage>
    </Art>
  );
}

/* ---------- Collect: each call lands as a row ---------- */

const rowIn = (from: number) => keyframes`
  0%, ${from}% { opacity: 0; transform: translateY(-8px); }
  ${from + 7}%, 100% { opacity: 1; transform: none; }
`;

const flash = (from: number) => keyframes`
  0%, ${from}% { background: transparent; }
  ${from + 5}% { background: var(--flash); }
  ${from + 22}%, 100% { background: transparent; }
`;

const Table = styled.div`
  position: absolute;
  inset: ${({ theme }) => theme.space(4)};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
`;

const cells = css`
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 1.1fr;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: 0 ${({ theme }) => theme.space(3)};
`;

const TableHead = styled.div`
  ${cells}
  ${type("caption")}
  padding-block: ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const TableRow = styled.div<{ $at: number }>`
  ${cells}
  ${type("caption")}
  flex: 1;
  --flash: ${({ theme }) => tint(theme.color.accent, 14)};
  color: ${({ theme }) => theme.color.fg};
  animation:
    ${({ $at }) => rowIn($at)} ${LOOP} ${({ theme }) => theme.motion.ease} infinite,
    ${({ $at }) => flash($at)} ${LOOP} linear infinite;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  code {
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Pill = styled.span<{ $tone: "success" | "warning" }>`
  justify-self: start;
  max-width: 100%;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) => theme.color[`${$tone}Soft`]};
  color: ${({ theme, $tone }) => theme.color[$tone]};
  font-family: ${({ theme }) => theme.font.mono};
`;

const ROWS = [
  { place: "Adilabad toll", onTime: "false", outcome: "completed", tone: "success" },
  { place: "Kamareddy", onTime: "true", outcome: "completed", tone: "success" },
  { place: "Kurnool bypass", onTime: "—", outcome: "partial", tone: "warning" },
] as const;

export function CollectArt() {
  return (
    <Art aria-hidden="true">
      <Table>
        <TableHead>
          <span>Location</span>
          <span>On time</span>
          <span>Outcome</span>
        </TableHead>
        {ROWS.map((row, i) => (
          <TableRow key={i} $at={8 + i * 22}>
            <span>{row.place}</span>
            <code>{row.onTime}</code>
            <Pill $tone={row.tone}>{row.outcome}</Pill>
          </TableRow>
        ))}
      </Table>
    </Art>
  );
}
