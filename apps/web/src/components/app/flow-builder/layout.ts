import type { FlowNode, NodeLayout } from "@oxumi/flow-core";
import { NODE_WIDTH, outputsOf } from "./model";

// Rail layout, written for call flows. The result should read like a ruled
// diagram: one straight main line, and each alternative on a parallel row.
//
//  1. Columns. Edges that close a loop are set aside; a node's column is its
//     longest path from the start. Columns sit on a fixed pitch.
//  2. The main line. From the start, follow each step's continuation (for a
//     branch, its "otherwise" path) to the end. All of it goes on row 0.
//  3. Alternatives. Every other output of a branch starts a path that gets a
//     row of its own until it rejoins a step already placed. Outputs drawn
//     above the continuation go above it and those below go below, which is
//     the arrangement in which no line has to cross another.
//  4. Rows sit on a fixed pitch, and a node is positioned by its *anchor*: the
//     handle a rail passes through. Nodes of different heights therefore line
//     up on their handles, and the edges between them are straight.
//  5. A flow much wider than the canvas is folded onto a second or third rail
//     (a serpentine), cut only where a single line crosses.
//  6. Steps the start cannot reach are laid out the same way in a row beneath.

export type Size = {
  width: number;
  height: number;
  // Distance from the node's top to the handle a rail passes through.
  anchor?: number;
};

export const GRID = 20;
export const COLUMN_PITCH = 380;
const ROW_PITCH_MIN = 160;
const ROW_CLEARANCE = 28;
// Between two rails of a folded flow, and above the unreachable steps.
const BAND_GAP = 100;
const LOOSE_GAP = 120;
// Fold only when the flow would otherwise be shown smaller than this, and
// only when folding makes it clearly bigger.
const FOLD_BELOW_ZOOM = 0.6;
const FOLD_GAIN = 1.2;
// What a fitted view keeps free around the flow: sides, then top and bottom.
const VIEW_MARGIN_X = 80;
const VIEW_MARGIN_Y = 156;

const snap = (value: number) => Math.round(value / GRID) * GRID;
const snapUp = (value: number) => Math.ceil(value / GRID) * GRID;

// Used before a node has been measured in the browser.
export function estimateHeight(node: FlowNode): number {
  switch (node.type) {
    case "branch":
      return 53 + (node.branches.length + 1) * 36 + 10;
    case "ask":
      return 53 + 46 + (node.guidance ? 48 : 0);
    case "end":
      return 53 + 92;
    case "transfer":
      return 53 + 92 + 45;
    default:
      return 53 + 84;
  }
}

// A branch is entered and continued at its "otherwise" row, the last one, and
// a transfer at its "if no one can take it" row; every other node at its
// vertical centre.
const BRANCH_ANCHOR_FROM_BOTTOM = 23;
export function anchorOf(node: FlowNode, size?: Size): number {
  if (size?.anchor !== undefined) return size.anchor;
  const height = size?.height ?? estimateHeight(node);
  return node.type === "branch" || node.type === "transfer"
    ? height - BRANCH_ANCHOR_FROM_BOTTOM
    : height / 2;
}

// The output a path carries on through: a branch's "otherwise" when it is
// connected, else its first connected condition.
export function continuationIndex(node: FlowNode, exists: (id: string) => boolean): number {
  const outputs = outputsOf(node);
  const last = outputs.length - 1;
  if (last >= 0 && exists(outputs[last]!.target)) return last;
  return outputs.findIndex((o) => exists(o.target));
}

interface Cell {
  col: number;
  row: number;
}

interface Block {
  cells: Map<string, Cell>;
  cols: number;
  // The main line, in order.
  main: string[];
  // Edges that do not close a loop: [from, to].
  forward: [string, string][];
}

function layoutBlock(nodes: FlowNode[], root: string): Block {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const exists = (id: string) => byId.has(id);

  // 1. Depth-first from the root. An edge back to a node still on the stack
  //    closes a loop and takes no part in the layout.
  const loops = new Set<string>();
  const forward: [string, string][] = [];
  const state = new Map<string, "open" | "done">();
  const order: string[] = [];
  const visit = (id: string) => {
    state.set(id, "open");
    outputsOf(byId.get(id)!).forEach((out, index) => {
      if (!exists(out.target)) return;
      if (state.get(out.target) === "open") {
        loops.add(`${id}#${index}`);
        return;
      }
      forward.push([id, out.target]);
      if (!state.has(out.target)) visit(out.target);
    });
    state.set(id, "done");
    order.push(id);
  };
  visit(root);
  order.reverse(); // topological

  const col = new Map<string, number>(order.map((id) => [id, 0]));
  for (const id of order) {
    for (const [from, to] of forward) {
      if (from === id) col.set(to, Math.max(col.get(to)!, col.get(id)! + 1));
    }
  }

  // Usable outputs of a node, and the one its path continues through.
  const usable = (id: string) =>
    outputsOf(byId.get(id)!).map((out, index) =>
      exists(out.target) && !loops.has(`${id}#${index}`) ? out.target : null,
    );
  const continuation = (id: string): number => {
    const targets = usable(id);
    const last = targets.length - 1;
    return last >= 0 && targets[last] ? last : targets.findIndex(Boolean);
  };

  // 2 and 3. Rows. Each row remembers the column spans in use on it.
  const cells = new Map<string, Cell>();
  const spans = new Map<number, [number, number][]>();
  const busy = (row: number, from: number, to: number) =>
    (spans.get(row) ?? []).some(([a, b]) => a <= to && from <= b);
  const clearBetween = (rowA: number, rowB: number, at: number) => {
    for (let row = Math.min(rowA, rowB) + 1; row < Math.max(rowA, rowB); row++) {
      if (busy(row, at, at)) return false;
    }
    return true;
  };

  // The nodes a path starting at `first` would take, and where it rejoins.
  const walk = (first: string) => {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | null = first;
    while (current && !cells.has(current) && !seen.has(current)) {
      path.push(current);
      seen.add(current);
      const targets = usable(current);
      current = targets[continuation(current)] ?? null;
    }
    return { path, rejoin: current && cells.has(current) ? current : null };
  };

  const run = (first: string, row: number, from: number): string[] => {
    const { path, rejoin } = walk(first);
    for (const id of path) cells.set(id, { col: col.get(id)!, row });
    const to = rejoin ? col.get(rejoin)! - 0.5 : col.get(path[path.length - 1]!)!;
    if (!spans.has(row)) spans.set(row, []);
    spans.get(row)!.push([from, Math.max(from, to)]);

    for (const id of path) {
      const targets = usable(id);
      if (targets.length < 2) continue;
      const main = continuation(id);
      // Nearest to the continuation first, so the outermost output ends up on
      // the outermost row and the lines leaving the branch do not cross.
      for (let i = main - 1; i >= 0; i--) spawn(id, targets[i], -1, row);
      for (let i = main + 1; i < targets.length; i++) spawn(id, targets[i], 1, row);
    }
    return path;
  };

  const spawn = (branch: string, target: string | null | undefined, side: 1 | -1, row: number) => {
    if (!target || cells.has(target)) return;
    const { path, rejoin } = walk(target);
    const from = col.get(branch)! + 0.5;
    const to = rejoin ? col.get(rejoin)! - 0.5 : col.get(path[path.length - 1]!)!;
    let chosen = row + side;
    let fallback: number | null = null;
    for (let step = 1; step <= nodes.length + 1; step++) {
      const candidate = row + side * step;
      if (busy(candidate, from, to)) continue;
      fallback ??= candidate;
      // Its line out of the branch, and its line back in, must not cut
      // through a row lying in between.
      const out = clearBetween(row, candidate, from);
      const back = !rejoin || clearBetween(candidate, cells.get(rejoin)!.row, to);
      if (out && back) {
        chosen = candidate;
        fallback = candidate;
        break;
      }
    }
    run(target, fallback ?? chosen, from);
  };

  const main = run(root, 0, 0);
  return {
    cells,
    cols: Math.max(...[...cells.values()].map((c) => c.col)) + 1,
    main,
    forward,
  };
}

// Where to fold a block onto several rails: after which columns to cut.
// Returns the first column of each rail. A cut is only made where exactly one
// line crosses, and that line belongs to the main line.
function foldPoints(
  block: Block,
  rowPitch: number,
  viewport: { width: number; height: number } | undefined,
): number[] {
  const single = [0];
  if (!viewport || block.cols < 6) return single;
  const mainSet = new Set(block.main);
  const valid: number[] = []; // cut between column c and c + 1
  for (let c = 0; c < block.cols - 1; c++) {
    const crossing = block.forward.filter(
      ([from, to]) => block.cells.get(from)!.col <= c && block.cells.get(to)!.col > c,
    );
    if (crossing.length === 1 && mainSet.has(crossing[0]![0]) && mainSet.has(crossing[0]![1]))
      valid.push(c);
  }

  const zoomFor = (starts: number[]) => {
    let widest = 0;
    let height = 0;
    starts.forEach((start, i) => {
      const end = starts[i + 1] ?? block.cols;
      widest = Math.max(widest, end - start);
      const rows = [...block.cells.values()].filter((c) => c.col >= start && c.col < end);
      const span = Math.max(...rows.map((c) => c.row)) - Math.min(...rows.map((c) => c.row));
      height += (span + 1) * rowPitch + (i ? BAND_GAP : 0);
    });
    const width = (widest - 1) * COLUMN_PITCH + NODE_WIDTH;
    return Math.min(
      (viewport.width - VIEW_MARGIN_X) / width,
      (viewport.height - VIEW_MARGIN_Y) / height,
      1,
    );
  };

  let best = single;
  let bestZoom = zoomFor(single);
  if (bestZoom >= FOLD_BELOW_ZOOM) return single;
  for (let rails = 2; rails <= 4; rails++) {
    const starts = [0];
    for (let i = 1; i < rails; i++) {
      const ideal = (block.cols * i) / rails - 1;
      const previous = starts[starts.length - 1]!;
      const cut = valid
        .filter((c) => c + 1 > previous)
        .sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];
      if (cut === undefined) break;
      starts.push(cut + 1);
    }
    if (starts.length !== rails) continue;
    const zoom = zoomFor(starts);
    if (zoom >= bestZoom * FOLD_GAIN) {
      best = starts;
      bestZoom = zoom;
    }
  }
  return best;
}

export interface LayoutOptions {
  // Measured sizes, where the browser has them.
  sizes?: Record<string, Size | undefined>;
  // The canvas the layout will be shown in. Lets a wide flow fold to fit it.
  viewport?: { width: number; height: number };
}

export function autoLayout(
  nodes: FlowNode[],
  start: string,
  { sizes = {}, viewport }: LayoutOptions = {},
): NodeLayout {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!nodes.length) return {};
  const heightOf = (node: FlowNode) => sizes[node.id]?.height ?? estimateHeight(node);
  const anchor = (node: FlowNode) => anchorOf(node, sizes[node.id]);

  // One pitch for every row: enough for the tallest part above a rail plus
  // the tallest part below one.
  const above = Math.max(...nodes.map(anchor));
  const below = Math.max(...nodes.map((n) => heightOf(n) - anchor(n)));
  const rowPitch = Math.max(ROW_PITCH_MIN, snapUp(above + below + ROW_CLEARANCE));

  const positions: NodeLayout = {};
  // Places a set of cells with its first row's rail at `top + above`, and
  // returns the y just below it.
  const put = (cells: [string, Cell][], colOffset: number, top: number): number => {
    const minRow = Math.min(...cells.map(([, c]) => c.row));
    const maxRow = Math.max(...cells.map(([, c]) => c.row));
    const firstRail = snapUp(top + above);
    for (const [id, cell] of cells) {
      const node = byId.get(id)!;
      positions[id] = {
        x: (cell.col + colOffset) * COLUMN_PITCH,
        y: Math.round((firstRail + (cell.row - minRow) * rowPitch - anchor(node)) * 100) / 100,
      };
    }
    return firstRail + (maxRow - minRow) * rowPitch + below;
  };

  const placed = new Set<string>();
  let bottom = 0;
  if (byId.has(start)) {
    const reachable: FlowNode[] = [];
    const stack = [start];
    while (stack.length) {
      const node = byId.get(stack.pop()!);
      if (!node || placed.has(node.id)) continue;
      placed.add(node.id);
      reachable.push(node);
      for (const out of outputsOf(node)) stack.push(out.target);
    }
    const block = layoutBlock(reachable, start);
    const starts = foldPoints(block, rowPitch, viewport);
    starts.forEach((first, i) => {
      const end = starts[i + 1] ?? block.cols;
      const cells = [...block.cells].filter(([, c]) => c.col >= first && c.col < end);
      bottom = put(cells, -first, i ? bottom + BAND_GAP : 0);
    });
  }

  // Unreachable steps: each loose piece laid out the same way, side by side
  // in one band underneath.
  const rest = nodes.filter((n) => !placed.has(n.id));
  if (rest.length) {
    const pointedAt = new Set(
      rest.flatMap((n) => outputsOf(n).map((o) => o.target).filter((t) => t !== n.id)),
    );
    const roots = [...rest.filter((n) => !pointedAt.has(n.id)), ...rest];
    const pieces: Block[] = [];
    for (const root of roots) {
      if (placed.has(root.id)) continue;
      const members: FlowNode[] = [];
      const stack = [root.id];
      while (stack.length) {
        const node = byId.get(stack.pop()!);
        if (!node || placed.has(node.id)) continue;
        placed.add(node.id);
        members.push(node);
        for (const out of outputsOf(node)) stack.push(out.target);
      }
      pieces.push(layoutBlock(members, root.id));
    }
    // Shift every piece so the highest row among them is row 0.
    const minRow = Math.min(...pieces.flatMap((p) => [...p.cells.values()].map((c) => c.row)));
    let colOffset = 0;
    const cells: [string, Cell][] = [];
    for (const piece of pieces) {
      for (const [id, cell] of piece.cells) {
        cells.push([id, { col: cell.col + colOffset, row: cell.row - minRow }]);
      }
      colOffset += piece.cols;
    }
    put(cells, 0, placed.size > rest.length ? bottom + LOOSE_GAP : 0);
  }
  return positions;
}

// Keeps saved positions and finds a free spot for any node that has none. A
// flow with no saved positions at all gets the full layout.
export function completeLayout(
  nodes: FlowNode[],
  start: string,
  saved: NodeLayout,
  sizes: Record<string, Size | undefined> = {},
): { layout: NodeLayout; generated: boolean } {
  const missing = nodes.filter((n) => !saved[n.id]);
  if (!missing.length) return { layout: saved, generated: false };
  const auto = autoLayout(nodes, start, { sizes });
  const anchor = nodes.find((n) => saved[n.id]);
  if (!anchor) return { layout: auto, generated: true };

  // Shift the automatic layout so it agrees with a node the user has placed.
  const dx = saved[anchor.id]!.x - auto[anchor.id]!.x;
  const dy = saved[anchor.id]!.y - auto[anchor.id]!.y;
  const layout: NodeLayout = {};
  for (const node of nodes) {
    if (saved[node.id]) layout[node.id] = saved[node.id]!;
  }
  const heightOf = (node: FlowNode) => sizes[node.id]?.height ?? estimateHeight(node);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of missing) {
    const pos = { x: snap(auto[node.id]!.x + dx), y: auto[node.id]!.y + dy };
    const overlaps = () =>
      Object.entries(layout).some(([id, other]) => {
        const height = byId.has(id) ? heightOf(byId.get(id)!) : 0;
        return (
          Math.abs(other.x - pos.x) < NODE_WIDTH + 24 &&
          pos.y < other.y + height + 24 &&
          other.y < pos.y + heightOf(node) + 24
        );
      });
    while (overlaps()) pos.y += GRID * 2;
    layout[node.id] = pos;
  }
  return { layout, generated: false };
}
