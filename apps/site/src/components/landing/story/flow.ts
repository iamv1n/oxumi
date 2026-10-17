// Geometry for the flow canvas: the driver status check drawn twice, as a wide
// left-to-right graph and as a tall top-to-bottom one for narrow screens.

import type { NodeKind } from "./script";

export type Pt = readonly [number, number];

export interface GraphNode {
  id: string;
  kind: NodeKind;
  title: string;
  meta: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GraphEdge {
  id: string;
  points: Pt[];
  label?: { text: string; x: number; y: number; w: number; branch?: boolean };
}

export interface GraphLayout {
  id: "wide" | "tall";
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  // Route a late trip takes, through node centres.
  pulse: Pt[];
  branchCaption: { x: number; y: number; anchor: "middle" | "end" };
}

const H = 78;
const D = 52; // branch diamond bounding box

const CONTENT = {
  greeting: { kind: "start", title: "Greeting", meta: "say: opening line" },
  ask_location: { kind: "ask", title: "Where are you?", meta: "current_location" },
  ask_schedule: { kind: "ask", title: "On schedule?", meta: "on_schedule" },
  check_schedule: { kind: "branch", title: "Late?", meta: "" },
  ask_delay: { kind: "ask", title: "Reason + new ETA", meta: "delay_reason · revised_eta" },
  ask_help: { kind: "ask", title: "Need any help?", meta: "needs_help" },
  goodbye: { kind: "end", title: "Goodbye", meta: "outcome: completed" },
} as const satisfies Record<string, Pick<GraphNode, "kind" | "title" | "meta">>;

type Id = keyof typeof CONTENT;

const node = (id: Id, x: number, y: number, w: number, h = H): GraphNode => ({
  id,
  ...CONTENT[id],
  x,
  y,
  w,
  h,
});

/* Wide: one row, with the delay step lifted above it. */
const ROW = 176;
const MID = ROW + H / 2;
const UP = 36;

export const WIDE: GraphLayout = {
  id: "wide",
  width: 1128,
  height: 300,
  nodes: [
    node("greeting", 24, ROW, 156),
    node("ask_location", 216, ROW, 156),
    node("ask_schedule", 408, ROW, 156),
    node("check_schedule", 600, MID - D / 2, D, D),
    node("ask_delay", 676, UP, 216),
    node("ask_help", 756, ROW, 156),
    node("goodbye", 948, ROW, 156),
  ],
  edges: [
    { id: "a", points: [[180, MID], [216, MID]] },
    { id: "b", points: [[372, MID], [408, MID]] },
    { id: "c", points: [[564, MID], [600, MID]] },
    {
      id: "late",
      points: [[626, MID - D / 2], [626, UP + H / 2], [676, UP + H / 2]],
      label: { text: "late", x: 626, y: 128, w: 40, branch: true },
    },
    {
      id: "ontime",
      points: [[652, MID], [756, MID]],
      label: { text: "on time", x: 701, y: MID, w: 58 },
    },
    { id: "rejoin", points: [[834, UP + H], [834, ROW]] },
    { id: "d", points: [[912, MID], [948, MID]] },
  ],
  pulse: [
    [102, MID],
    [626, MID],
    [626, UP + H / 2],
    [834, UP + H / 2],
    [834, MID],
    [1026, MID],
  ],
  branchCaption: { x: 626, y: MID + D / 2 + 20, anchor: "middle" },
};

/* Tall: one column, with the delay step set to the right. */
const COL = 16;
const CW = 168;
const CX = COL + CW / 2;

export const TALL: GraphLayout = {
  id: "tall",
  width: 348,
  height: 744,
  nodes: [
    node("greeting", COL, 16, CW),
    node("ask_location", COL, 126, CW),
    node("ask_schedule", COL, 236, CW),
    node("check_schedule", CX - D / 2, 346, D, D),
    node("ask_delay", 116, 430, 216),
    node("ask_help", COL, 540, CW),
    node("goodbye", COL, 650, CW),
  ],
  edges: [
    { id: "a", points: [[CX, 94], [CX, 126]] },
    { id: "b", points: [[CX, 204], [CX, 236]] },
    { id: "c", points: [[CX, 314], [CX, 346]] },
    {
      id: "late",
      points: [[CX + D / 2, 372], [224, 372], [224, 430]],
      label: { text: "late", x: 176, y: 372, w: 40, branch: true },
    },
    {
      id: "ontime",
      points: [[CX, 398], [CX, 540]],
      label: { text: "on time", x: CX, y: 417, w: 58 },
    },
    { id: "rejoin", points: [[224, 508], [224, 524], [152, 524], [152, 540]] },
    { id: "d", points: [[CX, 618], [CX, 650]] },
  ],
  pulse: [
    [CX, 55],
    [CX, 372],
    [224, 372],
    [224, 524],
    [152, 524],
    [152, 579],
    [CX, 579],
    [CX, 689],
  ],
  branchCaption: { x: CX - D / 2 - 8, y: 376, anchor: "end" },
};

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const toward = (from: Pt, to: Pt, by: number): Pt => {
  const d = dist(from, to) || 1;
  return [from[0] + ((to[0] - from[0]) * by) / d, from[1] + ((to[1] - from[1]) * by) / d];
};

// SVG path through the points with rounded corners.
export function roundedPath(points: Pt[], radius = 16): string {
  const out = [`M${points[0]![0]} ${points[0]![1]}`];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const here = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(radius, dist(prev, here) / 2, dist(here, next) / 2);
    const a = toward(here, prev, r);
    const b = toward(here, next, r);
    out.push(`L${a[0]} ${a[1]}`, `Q${here[0]} ${here[1]} ${b[0]} ${b[1]}`);
  }
  const last = points.at(-1)!;
  out.push(`L${last[0]} ${last[1]}`);
  return out.join(" ");
}

// An edge's line (stopping short of its target) and the arrowhead on its tip.
export function arrow(points: Pt[], size = 7) {
  const tip = points.at(-1)!;
  const before = points.at(-2)!;
  const base = toward(tip, before, size);
  const [dx, dy] = [(tip[0] - base[0]) / size, (tip[1] - base[1]) / size];
  const half = size * 0.55;
  const head = [
    tip,
    [base[0] - dy * half, base[1] + dx * half],
    [base[0] + dy * half, base[1] - dx * half],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return { line: roundedPath([...points.slice(0, -1), toward(tip, before, size - 1)]), head };
}

// For each node, the span of the pulse's journey (0..1) spent inside it.
export function visits(layout: GraphLayout): Record<string, { enter: number; leave: number }> {
  const samples: { at: number; p: Pt }[] = [];
  let travelled = 0;
  for (let i = 1; i < layout.pulse.length; i++) {
    const from = layout.pulse[i - 1]!;
    const to = layout.pulse[i]!;
    const length = dist(from, to);
    for (let s = 0; s < length; s += 2) samples.push({ at: travelled + s, p: toward(from, to, s) });
    travelled += length;
  }
  const result: Record<string, { enter: number; leave: number }> = {};
  for (const n of layout.nodes) {
    const inside = samples.filter(
      ({ p }) => p[0] >= n.x && p[0] <= n.x + n.w && p[1] >= n.y && p[1] <= n.y + n.h,
    );
    if (!inside.length) continue;
    result[n.id] = { enter: inside[0]!.at / travelled, leave: inside.at(-1)!.at / travelled };
  }
  return result;
}
