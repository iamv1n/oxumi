"use client";

import { ExpandOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  MarkerType,
  Panel,
  type ReactFlowState,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { Button, Tooltip } from "antd";
import { memo, useCallback } from "react";
import styled from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { type Rect, routeEdge, type RouteInput } from "./routing";

// React Flow dressed in our tokens, plus the edge the builder draws.

export type FlowEdge = Edge<
  {
    label?: string;
    // The full condition, when the label is a shortened form of it.
    title?: string;
    otherwise?: boolean;
    // Routing hints; see RouteInput.
    rank?: number;
    up?: boolean;
    fan?: boolean;
  },
  "flow"
>;

// React Flow takes these as plain strings rather than CSS.
export const GRID_COLOR = color.lineStrong;
export const MINIMAP_MASK = `color-mix(in srgb, ${color.canvas} 72%, transparent)`;
export const arrow = (selected: boolean) => ({
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: selected ? color.accentLine : color.fgSubtle,
});

const EdgeLabel = styled.div<{ $selected: boolean; $otherwise: boolean }>`
  position: absolute;
  max-width: 108px;
  padding: 1px ${({ theme }) => theme.space(2)};
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.color.accentLine : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme, $selected, $otherwise }) =>
    $selected ? theme.color.accentText : $otherwise ? theme.color.fgSubtle : theme.color.fgMuted};
  ${type("caption")}
  font-style: ${({ $otherwise }) => ($otherwise ? "italic" : "normal")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`;

// Node rectangles as the router wants them, read straight from the store so
// an edge re-routes while nodes are dragged or gliding.
function routeFrom(state: ReactFlowState, input: RouteInput): string {
  const rects: Rect[] = [];
  for (const node of state.nodeLookup.values()) {
    const { width, height } = node.measured;
    if (!width || !height) continue;
    const { x, y } = node.internals.positionAbsolute;
    rects.push({ id: node.id, x, y, width, height });
  }
  const route = routeEdge(input, rects);
  return `${route.path}|${route.labelX}|${route.labelY}`;
}

export const FlowEdgeView = memo(function FlowEdgeView({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  selected,
  data,
}: EdgeProps<FlowEdge>) {
  const rank = data?.rank ?? 0;
  const up = !!data?.up;
  const fan = !!data?.fan;
  // A string, so the edge re-renders only when its route really changes.
  const route = useStore(
    useCallback(
      (state: ReactFlowState) =>
        routeFrom(state, {
          source,
          target,
          sx: sourceX,
          sy: sourceY,
          tx: targetX,
          ty: targetY,
          rank,
          up,
          fan,
        }),
      [source, target, sourceX, sourceY, targetX, targetY, rank, up, fan],
    ),
  );
  const [path, labelX, labelY] = route.split("|");
  return (
    <>
      <BaseEdge id={id} path={path!} markerEnd={markerEnd} interactionWidth={24} />
      {data?.label && (
        <EdgeLabelRenderer>
          <EdgeLabel
            $selected={!!selected}
            $otherwise={!!data.otherwise}
            title={data.title ?? data.label}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </EdgeLabel>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// ---- Zoom controls --------------------------------------------------------

const ZoomGroup = styled.div`
  display: flex;
  align-items: center;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.node};

  .percent {
    min-width: 52px;
    font-variant-numeric: tabular-nums;
  }
  .rule {
    width: 1px;
    height: 16px;
    margin: 0 2px;
    background: ${({ theme }) => theme.color.line};
  }
`;

export const FIT_SHORTCUT = "Shift+1";

// Zoom out, the current zoom (click for 100%), zoom in, and fit to screen.
export function ZoomBar({ onFit }: { onFit: () => void }) {
  const flow = useReactFlow();
  const percent = useStore((state: ReactFlowState) => Math.round(state.transform[2] * 100));
  const atMin = useStore((state: ReactFlowState) => state.transform[2] <= state.minZoom);
  const atMax = useStore((state: ReactFlowState) => state.transform[2] >= state.maxZoom);
  return (
    <Panel position="bottom-left">
      <ZoomGroup role="group" aria-label="Zoom">
        <Tooltip title="Zoom out">
          <Button
            type="text"
            size="small"
            icon={<MinusOutlined />}
            aria-label="Zoom out"
            disabled={atMin}
            onClick={() => void flow.zoomOut({ duration: 150 })}
          />
        </Tooltip>
        <Tooltip title="Zoom to 100%">
          <Button
            type="text"
            size="small"
            className="percent"
            aria-label={`Zoom ${percent}%. Reset to 100%`}
            onClick={() => void flow.zoomTo(1, { duration: 200 })}
          >
            {percent}%
          </Button>
        </Tooltip>
        <Tooltip title="Zoom in">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            aria-label="Zoom in"
            disabled={atMax}
            onClick={() => void flow.zoomIn({ duration: 150 })}
          />
        </Tooltip>
        <span className="rule" />
        <Tooltip title={`Fit to screen (${FIT_SHORTCUT})`}>
          <Button
            type="text"
            size="small"
            icon={<ExpandOutlined />}
            aria-label="Fit to screen"
            onClick={onFit}
          />
        </Tooltip>
      </ZoomGroup>
    </Panel>
  );
}

// A faint line through a dragged node and the neighbour it has lined up with.
export const Guide = styled.div<{ $axis: "x" | "y" }>`
  position: absolute;
  pointer-events: none;
  background: ${({ theme }) => theme.color.accentLine};
  opacity: 0.45;
  ${({ $axis }) => ($axis === "y" ? "height: 1px;" : "width: 1px;")}
`;

export const edgeTypes = { flow: FlowEdgeView };

// A tab on the canvas edge that folds the panel next to it away.
export const PanelToggle = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  top: ${({ theme }) => theme.space(3)};
  ${({ $side }) => $side}: 0;
  z-index: 6;
  display: grid;
  place-items: center;
  width: 22px;
  height: 40px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-${({ $side }) => $side}: 0;
  border-radius: ${({ theme, $side }) =>
    $side === "left"
      ? `0 ${theme.radius.control} ${theme.radius.control} 0`
      : `${theme.radius.control} 0 0 ${theme.radius.control}`};
  background: ${({ theme }) => theme.color.elevated};
  color: ${({ theme }) => theme.color.fgMuted};
  font-size: 11px;
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.color.overlay};
    color: ${({ theme }) => theme.color.fg};
  }
`;

export const CanvasFrame = styled.div<{ $dropping: boolean }>`
  position: relative;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.color.canvas};

  .react-flow {
    --xy-background-color: ${({ theme }) => theme.color.canvas};
    --xy-edge-stroke: ${({ theme }) => theme.color.fgSubtle};
    --xy-edge-stroke-selected: ${({ theme }) => theme.color.accentLine};
    --xy-edge-stroke-width: 1.5;
    --xy-connectionline-stroke: ${({ theme }) => theme.color.accentLine};
    --xy-connectionline-stroke-width: 2;
    --xy-selection-background-color: color-mix(
      in srgb,
      ${({ theme }) => theme.color.accent} 6%,
      transparent
    );
    --xy-selection-border: 1px solid ${({ theme }) => theme.color.accentLine};
    --xy-minimap-background-color: ${({ theme }) => theme.color.surface};
    --xy-minimap-node-stroke-color: transparent;
    --xy-controls-button-background-color: ${({ theme }) => theme.color.elevated};
    --xy-controls-button-background-color-hover: ${({ theme }) => theme.color.overlay};
    --xy-controls-button-color: ${({ theme }) => theme.color.fgMuted};
    --xy-controls-button-color-hover: ${({ theme }) => theme.color.fg};
    --xy-controls-button-border-color: ${({ theme }) => theme.color.line};
    --xy-controls-box-shadow: ${({ theme }) => theme.shadow.node};
    font-family: ${({ theme }) => theme.font.sans};
    outline: ${({ theme, $dropping }) =>
      $dropping ? `2px dashed ${theme.color.accentLine}` : "none"};
    outline-offset: -6px;
  }

  /* Nodes: the card inside draws everything, the wrapper only shows focus. */
  .react-flow__node {
    border-radius: ${({ theme }) => theme.radius.card};
    cursor: grab;
  }
  .react-flow__node.dragging {
    cursor: grabbing;
  }
  .react-flow__node:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }

  /* Handles. --tone is set by the node card around them. */
  .react-flow__handle {
    width: 12px;
    height: 12px;
    border: 2px solid var(--tone, ${({ theme }) => theme.color.fgSubtle});
    background: ${({ theme }) => theme.color.elevated};
    transition: box-shadow ${({ theme }) => theme.motion.fast};
  }
  .react-flow__handle::after {
    content: "";
    position: absolute;
    inset: -9px;
    border-radius: ${({ theme }) => theme.radius.pill};
  }
  .react-flow__handle.is-connected {
    background: var(--tone);
  }
  /* Inputs are a flat tab on the left edge, for an arrowhead to land on. */
  .react-flow__handle.target {
    width: 6px;
    height: 16px;
    border: 0;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.fgSubtle};
  }
  .react-flow__handle.source:hover,
  .react-flow__handle.connectingfrom {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--tone) 30%, transparent);
  }
  .react-flow__handle.target:hover {
    background: var(--tone);
  }
  .react-flow__handle.connectingto.valid {
    border-color: ${({ theme }) => theme.color.success};
    background: ${({ theme }) => theme.color.success};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.successSoft};
  }

  /* Edges */
  .react-flow__edge-path {
    transition: stroke ${({ theme }) => theme.motion.fast};
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: ${({ theme }) => theme.color.fgMuted};
  }
  .react-flow__edge.selected .react-flow__edge-path,
  .react-flow__edge:focus-visible .react-flow__edge-path {
    stroke: ${({ theme }) => theme.color.accentLine};
    stroke-width: 2;
  }
  .react-flow__edge:focus-visible {
    box-shadow: none;
  }
  .react-flow__edgeupdater {
    cursor: crosshair;
  }

  .react-flow__nodesselection-rect {
    border-radius: ${({ theme }) => theme.radius.card};
  }

  /* Chrome */
  .react-flow__controls {
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    overflow: hidden;
  }
  .react-flow__controls-button {
    width: 30px;
    height: 30px;
  }
  .react-flow__minimap {
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    overflow: hidden;
    box-shadow: ${({ theme }) => theme.shadow.node};
  }
`;
