"use client";

import "@xyflow/react/dist/style.css";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { FlowNode } from "@oxumi/flow-core";
import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionLineType,
  type Edge,
  type EdgeChange,
  MiniMap,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  useStore,
  ViewportPortal,
} from "@xyflow/react";
import { App, Tooltip } from "antd";
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { AiFlowDrawer } from "@/components/app/flow-ai/AiFlowDrawer";
import { NODE_KIND } from "@/components/app/kit";
import { useThemeMode } from "@oxumi/ui/design/theme-mode";
import { motion } from "@oxumi/ui/design/tokens";
import type { AgentDetail } from "@/lib/api";
import { routes } from "@/lib/routes";
import {
  arrow,
  CanvasFrame,
  edgeTypes,
  type FlowEdge,
  GRID_COLOR,
  Guide,
  MINIMAP_MASK,
  PanelToggle,
  ZoomBar,
} from "./canvas";
import { Inspector } from "./Inspector";
import {
  anchorOf,
  autoLayout,
  completeLayout,
  continuationIndex,
  estimateHeight,
  GRID,
  type Size,
} from "./layout";
import {
  type AddableKind,
  addNode,
  annotateIssues,
  conditionParts,
  conditionText,
  connect,
  createNode,
  disconnect,
  edgeId,
  NEXT_HANDLE,
  NODE_WIDTH,
  type NodeIssue,
  outputsOf,
  removeNodes,
  renameNode,
} from "./model";
import { CanvasFactsContext, nodeTypes, type StepNode } from "./nodes";
import { Palette, PALETTE_MIME } from "./Palette";
import { Toolbar } from "./Toolbar";
import { useFlowEditor } from "./useFlowEditor";

const Root = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 640px;
  background: ${({ theme }) => theme.color.canvas};
  /* An app surface: dragging across it should never select its labels. */
  user-select: none;

  input,
  textarea {
    user-select: text;
  }
`;

const Workspace = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 0;
`;

type Positions = Record<string, { x: number; y: number }>;

const FIT = { padding: 0.12, maxZoom: 1 };
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.75;
const VIEW_PADDING = 40;
// The zoom bar and the minimap sit along the bottom edge; a fitted flow
// stays clear of them.
const VIEW_PADDING_BOTTOM = 116;

// Programmatic moves glide; a drag never does.
const GLIDE_MS = 500;
const GLIDE_STAGGER_MS = 18;
const GLIDE_STAGGER_MAX_MS = 160;
const FIT_MS = 450;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The theme's easing curve as a function, so script-driven motion matches CSS.
const ease = (() => {
  const [x1, y1, x2, y2] = (motion.ease.match(/-?\d*\.?\d+/g) ?? ["0.2", "0.8", "0.2", "1"]).map(
    Number,
  ) as [number, number, number, number];
  const at = (t: number, a: number, b: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Solve the curve's x for t by bisection, then read off y.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid, x1, x2) < x) lo = mid;
      else hi = mid;
    }
    return at((lo + hi) / 2, y1, y2);
  };
})();

const snapTo = (value: number) => Math.round(value / GRID) * GRID;
const DELETE_KEYS = ["Backspace", "Delete"];

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

// A boolean kept in localStorage, for how the user likes the panels.
function usePersistentFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Storage unavailable: the choice lasts for this visit only.
      }
    },
    [key],
  );
  return [value, set];
}

type TourTargets = { output: string | null; branch: string | null };

// Picks the nodes the onboarding guide points at: ones fully on screen, so
// the spotlight never lands outside the canvas. Renders nothing.
function TourAnchors({
  start,
  onChange,
}: {
  start: string;
  onChange: (targets: TourTargets) => void;
}) {
  const key = useStore((state) => {
    const [x, y, zoom] = state.transform;
    let output = "";
    let branch = "";
    for (const node of state.nodeLookup.values()) {
      const { width, height } = node.measured;
      if (!width || !height) continue;
      const left = node.internals.positionAbsolute.x * zoom + x;
      const top = node.internals.positionAbsolute.y * zoom + y;
      if (left < 0 || top < 0) continue;
      if (left + width * zoom > state.width || top + height * zoom > state.height) continue;
      const kind = (node as unknown as StepNode).data.node.type;
      if (kind === "branch") branch ||= node.id;
      else if (kind !== "end" && (node.id === start || !output)) output = node.id;
    }
    return `${output}|${branch}`;
  });
  useEffect(() => {
    const [output, branch] = key.split("|");
    onChange({ output: output || null, branch: branch || null });
  }, [key, onChange]);
  return null;
}

function Builder({ agent, projectId }: { agent: AgentDetail; projectId: string }) {
  const { mode } = useThemeMode();
  const editor = useFlowEditor(agent);
  const [aiOpen, setAiOpen] = useState(false);
  const { doc, apply } = editor;
  const flow = useReactFlow<StepNode, FlowEdge>();
  const { message } = App.useApp();
  const frame = useRef<HTMLDivElement>(null);

  // View state that is not part of the document.
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [dragged, setDragged] = useState<Positions | null>(null);
  // Positions part-way through a glide, and lines for a drag that has lined up.
  const [gliding, setGliding] = useState<Positions | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null } | null>(null);
  const glideFrame = useRef(0);
  const dragging = useRef(false);
  const [dropping, setDropping] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = usePersistentFlag(
    "oxumi:builder:palette-collapsed",
  );
  const [inspectorCollapsed, setInspectorCollapsed] = usePersistentFlag(
    "oxumi:builder:inspector-collapsed",
  );
  // The selection the user folded the inspector away on, so it stays away
  // until they select something else.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [tour, setTour] = useState<TourTargets>({ output: null, branch: null });
  const [dataFor] = useState(() => new WeakMap<FlowNode, { node: FlowNode }>());

  const { fields, variables } = agent.flow;
  const issues = useMemo(() => annotateIssues(agent.issues, doc.nodes), [agent.issues, doc.nodes]);
  const facts = useMemo(() => {
    const byNode = new Map<string, NodeIssue[]>();
    for (const issue of issues) {
      if (!issue.nodeId) continue;
      if (!byNode.has(issue.nodeId)) byNode.set(issue.nodeId, []);
      byNode.get(issue.nodeId)!.push(issue);
    }
    return { fields: new Map(fields.map((f) => [f.name, f])), issues: byNode, tour };
  }, [fields, issues, tour]);

  // ---- Derive React Flow's nodes and edges from the document --------------

  const nodes = useMemo<StepNode[]>(
    () =>
      doc.nodes.map((node) => {
        let data = dataFor.get(node);
        if (!data) dataFor.set(node, (data = { node }));
        return {
          id: node.id,
          type: "step",
          position: gliding?.[node.id] ??
            dragged?.[node.id] ??
            doc.layout[node.id] ?? { x: 0, y: 0 },
          data,
          selected: selectedNodes.includes(node.id),
          measured: sizes[node.id],
          deletable: node.id !== doc.start,
          ariaLabel: `${NODE_KIND[node.type].label} step ${node.id}`,
        };
      }),
    [doc, dragged, gliding, selectedNodes, sizes, dataFor],
  );

  const edges = useMemo<FlowEdge[]>(() => {
    const ids = new Set(doc.nodes.map((n) => n.id));
    return doc.nodes.flatMap((node) => {
      const outputs = outputsOf(node);
      const fan = node.type === "branch";
      // Outputs above the one the path continues through leave upwards, the
      // rest downwards; the outermost turns first so their lines stay apart.
      const main = fan ? continuationIndex(node, (id) => ids.has(id)) : 0;
      // When every condition tests the same field, the node says which; the
      // edge only needs the rest ("is false").
      const oneField =
        fan && node.branches.every((b) => b.when.field === node.branches[0]?.when.field);
      return outputs
        .map((out, index) => ({ out, index }))
        .filter(({ out }) => ids.has(out.target))
        .map(({ out, index }) => {
          const id = edgeId(node.id, out.handle);
          const selected = selectedEdges.includes(id);
          const parts = out.when ? conditionParts(out.when) : null;
          const routing = {
            fan,
            up: fan && index < main,
            rank: !fan ? 0 : index < main ? index : index > main ? outputs.length - 1 - index : 0,
          };
          return {
            id,
            type: "flow" as const,
            source: node.id,
            sourceHandle: out.handle,
            target: out.target,
            selected,
            markerEnd: arrow(selected),
            data:
              out.when === undefined
                ? routing
                : out.when
                  ? {
                      ...routing,
                      label: oneField && parts ? `${parts.op} ${parts.value}`.trim() : conditionText(out.when),
                      title: conditionText(out.when),
                    }
                  : { ...routing, label: "otherwise", otherwise: true },
          };
        });
    });
  }, [doc.nodes, selectedEdges]);

  const selectedLinks = useMemo(
    () =>
      edges
        .filter((e) => e.selected)
        .map((e) => ({
          source: e.source,
          handle: e.sourceHandle ?? NEXT_HANDLE,
          target: e.target,
          label: e.data?.label,
        })),
    [edges],
  );

  const liveNodes = useMemo(
    () => selectedNodes.filter((id) => doc.nodes.some((n) => n.id === id)),
    [selectedNodes, doc.nodes],
  );

  // ---- Canvas events ------------------------------------------------------

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNode>[]) => {
      const moving: Positions = {};
      const dropped: Positions = {};
      const measured: Record<string, Size> = {};
      const selection = new Map<string, boolean>();
      let ended = false;
      // A drag is free while it lasts (changing positions mid-drag would fight
      // it). On release the group settles the last few pixels: x to the grid,
      // and y so that the first node's *handle* is on it. Handles on the grid
      // are what make rows of different-height nodes line up, and their edges
      // straight.
      let shift: { x: number; y: number } | null = null;
      const snapped = (id: string, pos: { x: number; y: number }) => {
        if (!shift) {
          const node = doc.nodes.find((n) => n.id === id);
          const anchor = node ? anchorOf(node, sizes[id]) : 0;
          shift = { x: snapTo(pos.x) - pos.x, y: snapTo(pos.y + anchor) - anchor - pos.y };
        }
        return { x: pos.x + shift.x, y: pos.y + shift.y };
      };
      for (const change of changes) {
        if (change.type === "position") {
          if (change.dragging && change.position) moving[change.id] = change.position;
          else {
            ended = true;
            if (!change.position) continue;
            const from = doc.layout[change.id];
            if (dragging.current || !from) {
              dropped[change.id] = snapped(change.id, change.position);
            } else {
              // An arrow key: one grid step in the direction pressed.
              dropped[change.id] = {
                x: from.x + Math.sign(Math.round(change.position.x - from.x)) * GRID,
                y: from.y + Math.sign(Math.round(change.position.y - from.y)) * GRID,
              };
            }
          }
        } else if (change.type === "dimensions" && change.dimensions) {
          // Where the node's rail handle sits: its input, or for the start
          // node its output.
          const bounds = flow.getInternalNode(change.id)?.internals.handleBounds;
          const handle = bounds?.target?.[0] ?? bounds?.source?.[0];
          measured[change.id] = {
            ...change.dimensions,
            anchor: handle ? handle.y + handle.height / 2 : undefined,
          };
        } else if (change.type === "select") {
          selection.set(change.id, change.selected);
        }
      }
      const movingIds = Object.keys(moving);
      if (movingIds.length || selection.size) holdFrameUntil.current = performance.now() + 700;
      if (movingIds.length) {
        dragging.current = true;
        cancelAnimationFrame(glideFrame.current);
        setGliding(null);
        setDragged((prev) => ({ ...prev, ...moving }));
        // Guides: the first dragged node level with, or in column with, a
        // node that is not being dragged.
        const lead = doc.nodes.find((n) => n.id === movingIds[0]);
        // Where the lead node would settle if released now.
        const at = snapped(movingIds[0]!, moving[movingIds[0]!]!);
        const leadY = at.y + (lead ? anchorOf(lead, sizes[lead.id]) : 0);
        let x: number | null = null;
        let y: number | null = null;
        for (const other of doc.nodes) {
          const pos = doc.layout[other.id];
          if (!pos || movingIds.includes(other.id)) continue;
          if (Math.abs(pos.x - at.x) < 0.5) x = at.x;
          if (Math.abs(pos.y + anchorOf(other, sizes[other.id]) - leadY) < 0.5) y = leadY;
        }
        setGuides(x === null && y === null ? null : { x, y });
      }
      if (ended) {
        dragging.current = false;
        setDragged(null);
        setGuides(null);
        apply((d) => {
          const layout = { ...d.layout };
          let changed = false;
          for (const [id, pos] of Object.entries(dropped)) {
            const next = { x: Math.round(pos.x), y: Math.round(pos.y * 100) / 100 };
            if (layout[id]?.x === next.x && layout[id]?.y === next.y) continue;
            layout[id] = next;
            changed = true;
          }
          return changed ? { ...d, layout } : d;
        }, "move");
      }
      if (Object.keys(measured).length) {
        setSizes((prev) => {
          const same = Object.entries(measured).every(
            ([id, size]) =>
              prev[id]?.width === size.width &&
              prev[id]?.height === size.height &&
              prev[id]?.anchor === size.anchor,
          );
          return same ? prev : { ...prev, ...measured };
        });
      }
      if (selection.size) {
        setSelectedNodes((prev) => [
          ...prev.filter((id) => selection.get(id) !== false),
          ...[...selection].filter(([id, on]) => on && !prev.includes(id)).map(([id]) => id),
        ]);
      }
    },
    [apply, doc.nodes, doc.layout, sizes, flow],
  );

  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    const selection = new Map<string, boolean>();
    for (const change of changes) {
      if (change.type === "select") selection.set(change.id, change.selected);
    }
    if (selection.size) {
      setSelectedEdges((prev) => [
        ...prev.filter((id) => selection.get(id) !== false),
        ...[...selection].filter(([id, on]) => on && !prev.includes(id)).map(([id]) => id),
      ]);
    }
  }, []);

  const isValidConnection = useCallback(
    (link: Connection | Edge) =>
      link.source !== link.target &&
      doc.nodes.some((n) => n.id === link.target && n.type !== "start"),
    [doc.nodes],
  );

  const onConnect = useCallback(
    (link: Connection) =>
      apply((d) => connect(d, link.source, link.sourceHandle ?? NEXT_HANDLE, link.target)),
    [apply],
  );

  const onReconnect = useCallback(
    (old: FlowEdge, link: Connection) =>
      apply((d) =>
        connect(
          disconnect(d, [{ source: old.source, handle: old.sourceHandle ?? NEXT_HANDLE }]),
          link.source,
          link.sourceHandle ?? NEXT_HANDLE,
          link.target,
        ),
      ),
    [apply],
  );

  const onDelete = useCallback(
    ({ nodes: gone, edges: cut }: { nodes: StepNode[]; edges: FlowEdge[] }) => {
      apply((d) =>
        removeNodes(
          disconnect(
            d,
            cut.map((e) => ({ source: e.source, handle: e.sourceHandle ?? NEXT_HANDLE })),
          ),
          gone.map((n) => n.id),
        ),
      );
      setSelectedEdges([]);
    },
    [apply],
  );

  // ---- Commands -----------------------------------------------------------

  const select = useCallback((ids: string[]) => {
    setSelectedNodes(ids);
    setSelectedEdges([]);
  }, []);

  const addAt = useCallback(
    (kind: AddableKind, position: { x: number; y: number }, clear = false) => {
      const node = createNode(doc, kind, fields);
      const anchor = anchorOf(node);
      const spot = { x: snapTo(position.x), y: snapTo(position.y + anchor) - anchor };
      if (clear) {
        // Slide down until the new step covers no other.
        const height = estimateHeight(node);
        const covered = () =>
          doc.nodes.find((other) => {
            const p = doc.layout[other.id];
            const h = sizes[other.id]?.height ?? estimateHeight(other);
            return (
              p &&
              Math.abs(p.x - spot.x) < NODE_WIDTH + 16 &&
              spot.y < p.y + h + 16 &&
              p.y < spot.y + height + 16
            );
          });
        for (let hit = covered(); hit; hit = covered()) {
          const under = doc.layout[hit.id]!.y + (sizes[hit.id]?.height ?? estimateHeight(hit)) + 24;
          spot.y = Math.ceil((under + anchor) / GRID) * GRID - anchor;
        }
      }
      apply((d) => (d.nodes.some((n) => n.id === node.id) ? d : addNode(d, node, spot)));
      select([node.id]);
    },
    [doc, fields, sizes, apply, select],
  );

  const addAtCentre = useCallback(
    (kind: AddableKind) => {
      const box = frame.current?.getBoundingClientRect();
      if (!box) return;
      const centre = flow.screenToFlowPosition({
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      });
      addAt(kind, { x: centre.x - NODE_WIDTH / 2, y: centre.y - 60 }, true);
    },
    [flow, addAt],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      const kind = event.dataTransfer.getData(PALETTE_MIME) as AddableKind | "";
      setDropping(false);
      if (!kind) return;
      event.preventDefault();
      const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addAt(kind, { x: point.x - NODE_WIDTH / 2, y: point.y - 26 });
    },
    [flow, addAt],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    if (!event.dataTransfer.types.includes(PALETTE_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // True while the view is one we framed and the user has not moved since,
  // so it can be re-framed when the canvas changes size.
  const autoFramed = useRef(false);
  // Selecting or dragging a step can slide the inspector open, which resizes
  // the canvas. Re-fitting then would move the step from under the pointer,
  // so re-framing is held off for a moment after either.
  const holdFrameUntil = useRef(0);

  // Fits a whole layout in the canvas, whatever panels are open around it.
  const frameLayout = useCallback(
    (layout: Positions, duration = 0) => {
      const box = frame.current?.getBoundingClientRect();
      const placed = doc.nodes.filter((n) => layout[n.id]);
      if (!box || !placed.length) return;
      const heightOf = (n: FlowNode) => sizes[n.id]?.height ?? estimateHeight(n);
      const left = Math.min(...placed.map((n) => layout[n.id]!.x));
      const right = Math.max(...placed.map((n) => layout[n.id]!.x + NODE_WIDTH));
      const top = Math.min(...placed.map((n) => layout[n.id]!.y));
      const bottom = Math.max(...placed.map((n) => layout[n.id]!.y + heightOf(n)));
      const zoom = Math.max(
        MIN_ZOOM,
        Math.min(
          (box.width - VIEW_PADDING * 2) / (right - left),
          (box.height - VIEW_PADDING - VIEW_PADDING_BOTTOM) / (bottom - top),
          1,
        ),
      );
      const usable = box.height - VIEW_PADDING - VIEW_PADDING_BOTTOM;
      autoFramed.current = true;
      void flow.setViewport(
        {
          x: box.width / 2 - ((left + right) / 2) * zoom,
          y: VIEW_PADDING + usable / 2 - ((top + bottom) / 2) * zoom,
          zoom,
        },
        { duration: reducedMotion() ? 0 : duration },
      );
    },
    [doc.nodes, sizes, flow],
  );

  const fit = useCallback(() => frameLayout(doc.layout, FIT_MS), [frameLayout, doc.layout]);

  // Glides nodes from one set of positions to another. The document already
  // holds the destination; only what is drawn moves, column by column.
  const glide = useCallback((from: Positions, to: Positions, done: () => void) => {
    cancelAnimationFrame(glideFrame.current);
    const ids = Object.keys(to).filter(
      (id) => from[id] && (from[id].x !== to[id]!.x || from[id].y !== to[id]!.y),
    );
    if (!ids.length || reducedMotion()) {
      setGliding(null);
      done();
      return;
    }
    const columns = [...new Set(ids.map((id) => to[id]!.x))].sort((a, b) => a - b);
    const delay = (id: string) =>
      Math.min(columns.indexOf(to[id]!.x) * GLIDE_STAGGER_MS, GLIDE_STAGGER_MAX_MS);
    const startedAt = performance.now();
    const step = (now: number) => {
      const frame: Positions = {};
      let moving = false;
      for (const id of ids) {
        const progress = (now - startedAt - delay(id)) / GLIDE_MS;
        if (progress < 1) moving = true;
        const t = ease(progress);
        frame[id] = {
          x: from[id]!.x + (to[id]!.x - from[id]!.x) * t,
          y: from[id]!.y + (to[id]!.y - from[id]!.y) * t,
        };
      }
      if (moving) {
        setGliding(frame);
        glideFrame.current = requestAnimationFrame(step);
      } else {
        setGliding(null);
        done();
      }
    };
    // Hold the old positions for the frame in which the document changes.
    setGliding(Object.fromEntries(ids.map((id) => [id, from[id]!])));
    glideFrame.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(glideFrame.current), []);

  const canvasSize = () => {
    const box = frame.current?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : undefined;
  };

  const tidy = useCallback(() => {
    const layout = autoLayout(doc.nodes, doc.start, { sizes, viewport: canvasSize() });
    const from = doc.layout;
    // One edit, so one undo step; the glide is only how it is shown.
    apply((d) => ({ ...d, layout }));
    glide(from, layout, () => frameLayout(layout, FIT_MS));
  }, [apply, doc.nodes, doc.start, doc.layout, sizes, glide, frameLayout]);

  const focusNode = useCallback(
    (id: string) => {
      const pos = doc.layout[id];
      const node = doc.nodes.find((n) => n.id === id);
      if (!pos || !node) return;
      select([id]);
      autoFramed.current = false;
      const height = sizes[id]?.height ?? estimateHeight(node);
      void flow.setCenter(pos.x + NODE_WIDTH / 2, pos.y + height / 2, { zoom: 1, duration: 300 });
    },
    [doc, sizes, flow, select],
  );

  const rename = useCallback(
    (from: string, to: string) => {
      apply((d) => renameNode(d, from, to));
      setSelectedNodes((prev) => prev.map((id) => (id === from ? to : id)));
      setSizes((prev) => (prev[from] ? { ...prev, [to]: prev[from] } : prev));
    },
    [apply],
  );

  const remove = useCallback(
    (ids: string[]) => {
      apply((d) => removeNodes(d, ids));
      select([]);
    },
    [apply, select],
  );

  // Once the browser has measured every node, redo a layout we generated from
  // estimated heights, so spacing is exact. Saved positions are never touched.
  const opened = useRef(false);
  const { layoutGenerated, rebaseLayout } = editor;
  useEffect(() => {
    if (opened.current || !doc.nodes.every((n) => sizes[n.id])) return;
    opened.current = true;
    let layout = doc.layout;
    if (layoutGenerated) {
      layout = autoLayout(doc.nodes, doc.start, { sizes, viewport: canvasSize() });
      rebaseLayout(layout);
    } else if (doc.nodes.some((n) => !agent.layout?.[n.id])) {
      // Some steps had no saved position and were placed from estimated
      // heights; place those again now that the real ones are known.
      layout = completeLayout(doc.nodes, doc.start, agent.layout ?? {}, sizes).layout;
      rebaseLayout(layout);
    }
    frameLayout(layout);
  }, [layoutGenerated, rebaseLayout, doc, sizes, frameLayout, agent.layout]);

  // The canvas changes size when a panel folds, the sidebar collapses or the
  // window resizes. A view we framed is framed again; a view the user chose
  // keeps its content where it is on screen.
  const reframe = useRef(() => {});
  useEffect(() => {
    reframe.current = () => frameLayout(doc.layout);
  });
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let last = el.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      if (opened.current) {
        if (autoFramed.current) {
          if (performance.now() > holdFrameUntil.current) reframe.current();
        }
        else if (box.left !== last.left) {
          const view = flow.getViewport();
          void flow.setViewport({ ...view, x: view.x - (box.left - last.left) });
        }
      }
      last = box;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [flow]);

  // Undo / redo. Text fields keep their own native undo.
  const { undo, redo } = editor;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.shiftKey && event.code === "Digit1" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        fit();
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, fit]);

  const lastError = useRef<string | null>(null);
  useEffect(() => {
    if (editor.saveError && editor.saveError !== lastError.current) {
      void message.error(`Could not save: ${editor.saveError}`);
    }
    lastError.current = editor.saveError;
  }, [editor.saveError, message]);

  const errors = issues.filter((i) => i.level === "error").length;

  const selectionKey = liveNodes.join(",");
  if (!selectionKey && dismissedFor !== null) setDismissedFor(null);
  const inspectorOpen =
    !inspectorCollapsed || (selectionKey !== "" && selectionKey !== dismissedFor);
  const toggleInspector = () => {
    setInspectorCollapsed(inspectorOpen);
    setDismissedFor(inspectorOpen ? selectionKey : null);
  };

  return (
    <Root>
      <Toolbar
        status={editor.status}
        saveError={editor.saveError}
        onRetry={editor.saveNow}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={undo}
        onRedo={redo}
        onTidy={tidy}
        onFit={fit}
        ready={agent.ready}
        errors={errors}
        warnings={issues.length - errors}
        onShowIssues={() => {
          select([]);
          setInspectorCollapsed(false);
        }}
        testHref={routes.agentTest(projectId, agent.id)}
        onAi={() => setAiOpen(true)}
      />
      <AiFlowDrawer
        agent={agent}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        saveStatus={editor.status}
        onSaveNow={editor.saveNow}
      />
      <Workspace>
        <Palette
          collapsed={paletteCollapsed}
          branchTour={!tour.branch}
          onAdd={addAtCentre}
          onDragState={setDropping}
        />
        <CanvasFrame ref={frame} $dropping={dropping}>
          <Tooltip title={paletteCollapsed ? "Show step names" : "Fold the palette"} placement="right">
            <PanelToggle
              type="button"
              $side="left"
              aria-label={paletteCollapsed ? "Expand the step palette" : "Collapse the step palette"}
              aria-expanded={!paletteCollapsed}
              onClick={() => setPaletteCollapsed(!paletteCollapsed)}
            >
              {paletteCollapsed ? <RightOutlined /> : <LeftOutlined />}
            </PanelToggle>
          </Tooltip>
          <Tooltip title={inspectorOpen ? "Fold the settings panel" : "Show the settings panel"} placement="left">
            <PanelToggle
              type="button"
              $side="right"
              data-tour={inspectorOpen ? undefined : "builder-inspector"}
              aria-label={inspectorOpen ? "Collapse the settings panel" : "Expand the settings panel"}
              aria-expanded={inspectorOpen}
              onClick={toggleInspector}
            >
              {inspectorOpen ? <RightOutlined /> : <LeftOutlined />}
            </PanelToggle>
          </Tooltip>
          <CanvasFactsContext.Provider value={facts}>
            <ReactFlow<StepNode, FlowEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              onDelete={onDelete}
              isValidConnection={isValidConnection}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onMoveStart={(event) => {
                if (event) autoFramed.current = false;
              }}
              colorMode={mode}
              fitView
              fitViewOptions={FIT}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              connectionLineType={ConnectionLineType.SmoothStep}
              deleteKeyCode={DELETE_KEYS}
              multiSelectionKeyCode={["Meta", "Control", "Shift"]}
              selectionKeyCode="Shift"
              selectionMode={SelectionMode.Partial}
              panOnScroll
              zoomOnDoubleClick={false}
              connectionRadius={28}
              elevateEdgesOnSelect
              proOptions={{ hideAttribution: true }}
              aria-label="Flow canvas"
            >
              <TourAnchors start={doc.start} onChange={setTour} />
              <Background variant={BackgroundVariant.Dots} gap={GRID} size={1.5} color={GRID_COLOR} />
              <ZoomBar onFit={fit} />
              {guides && (
                <ViewportPortal>
                  {guides.y !== null && (
                    <Guide $axis="y" style={{ left: -100000, width: 200000, top: guides.y }} />
                  )}
                  {guides.x !== null && (
                    <Guide $axis="x" style={{ top: -100000, height: 200000, left: guides.x }} />
                  )}
                </ViewportPortal>
              )}
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                maskColor={MINIMAP_MASK}
                nodeColor={(node: StepNode) => NODE_KIND[node.data.node.type].color}
                nodeBorderRadius={8}
                style={{ width: 148, height: 92 }}
                ariaLabel="Flow overview"
              />
            </ReactFlow>
          </CanvasFactsContext.Provider>
        </CanvasFrame>
        <Inspector
          open={inspectorOpen}
          doc={doc}
          selected={liveNodes}
          fields={fields}
          variables={variables}
          defaultAttempts={agent.flow.settings.maxAttempts}
          issues={issues}
          apply={apply}
          onRename={rename}
          onDelete={remove}
          onClose={() => select([])}
          onFocusNode={focusNode}
          connections={liveNodes.length ? [] : selectedLinks}
          onDisconnect={(links) => {
            apply((d) => disconnect(d, links));
            setSelectedEdges([]);
          }}
        />
      </Workspace>
    </Root>
  );
}

export function FlowBuilder({ agent, projectId }: { agent: AgentDetail; projectId: string }) {
  return (
    <ReactFlowProvider>
      <Builder agent={agent} projectId={projectId} />
    </ReactFlowProvider>
  );
}
