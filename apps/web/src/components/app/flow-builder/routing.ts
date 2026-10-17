// Edge routing: ruled lines instead of curves. An edge whose two handles are
// level is one straight segment. Otherwise it travels in horizontal and
// vertical runs with small rounded corners, turning in the gap between
// columns, and it goes around any node that would be in its way.

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RouteInput {
  source: string;
  target: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  // Order among the outputs of the same node that leave it on the same side:
  // each turns a little further out than the one before, so their vertical
  // runs stay apart.
  rank: number;
  // Which way to look first for a free lane when the edge has to go around.
  up: boolean;
  // The source is a branch: its lines fan out from it.
  fan: boolean;
}

export interface Route {
  path: string;
  labelX: number;
  labelY: number;
}

const OUT = 28; // from the source handle to the first turn
const OUT_STEP = 14; // extra for each rank
const IN = 32; // from the last turn to the target handle (room for the arrow)
const CLEAR = 12; // distance a line keeps from a node
const RADIUS = 8;
const LANE_STEP = 10;
const LABEL_FROM_SOURCE = 60;

type Point = [number, number];

// A polyline of horizontal and vertical runs, as an SVG path with its
// corners rounded.
function rounded(points: Point[]): string {
  const clean = points.filter(
    (p, i) => i === 0 || Math.abs(p[0] - points[i - 1]![0]) > 0.5 || Math.abs(p[1] - points[i - 1]![1]) > 0.5,
  );
  let d = `M${clean[0]![0]},${clean[0]![1]}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const [px, py] = clean[i - 1]!;
    const [cx, cy] = clean[i]!;
    const [nx, ny] = clean[i + 1]!;
    const before = Math.hypot(cx - px, cy - py);
    const after = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(RADIUS, before / 2, after / 2);
    const ax = cx - ((cx - px) / before) * r;
    const ay = cy - ((cy - py) / before) * r;
    const bx = cx + ((nx - cx) / after) * r;
    const by = cy + ((ny - cy) / after) * r;
    d += ` L${ax},${ay} Q${cx},${cy} ${bx},${by}`;
  }
  const last = clean[clean.length - 1]!;
  return `${d} L${last[0]},${last[1]}`;
}

export function routeEdge(edge: RouteInput, rects: Rect[]): Route {
  const { sx, sy, tx, ty, source, target } = edge;
  const hits = (x1: number, y1: number, x2: number, y2: number, skip: string[]) =>
    rects.some(
      (r) =>
        !skip.includes(r.id) &&
        Math.min(x1, x2) < r.x + r.width + CLEAR &&
        Math.max(x1, x2) > r.x - CLEAR &&
        Math.min(y1, y2) < r.y + r.height + CLEAR &&
        Math.max(y1, y2) > r.y - CLEAR,
    );

  const xa = sx + OUT + OUT_STEP * Math.min(edge.rank, 3);
  const xb = tx - IN;
  const forward = xb >= xa - OUT_STEP * 3 && tx - sx >= OUT + IN;
  const level = Math.abs(sy - ty) < 0.75;
  const nearSource = sx + Math.min(LABEL_FROM_SOURCE, (tx - sx) / 2);

  if (forward) {
    if (level) {
      if (!hits(sx, sy, tx, ty, [source, target])) {
        return { path: `M${sx},${sy} L${tx},${ty}`, labelX: nearSource, labelY: sy };
      }
    } else {
      const turn = Math.min(xa, xb);
      // Turn straight out of the source, then run along the target's row...
      const early =
        !hits(turn, sy, turn, ty, [source, target]) && !hits(turn, ty, tx, ty, [target]);
      // ...or run along the source's row and turn just before the target.
      const late = !hits(sx, sy, xb, sy, [source]) && !hits(xb, sy, xb, ty, [source, target]);
      // A branch fans out from where it is; anything else joins at the far end.
      const preferEarly = edge.fan;
      if (early && (preferEarly || !late)) {
        return {
          path: rounded([[sx, sy], [turn, sy], [turn, ty], [tx, ty]]),
          labelX: nearSource,
          labelY: Math.abs(ty - sy) > 48 ? (sy + ty) / 2 : ty,
        };
      }
      if (late) {
        return {
          path: rounded([[sx, sy], [xb, sy], [xb, ty], [tx, ty]]),
          labelX: nearSource,
          labelY: sy,
        };
      }
    }
  }

  // Around: out, along a free lane, and back in. Look for the lane on the
  // way towards the target first; for a level edge, on the preferred side.
  const from = Math.min(xa, xb);
  const to = Math.max(xa, xb);
  const free = (y: number) => !hits(from, y, to, y, []);
  const side = edge.up ? -1 : 1;
  const towards = edge.fan && edge.up ? side : Math.abs(ty - sy) > 40 ? Math.sign(ty - sy) : side;
  let lane = (sy + ty) / 2;
  search: for (const direction of [towards, -towards]) {
    for (let step = 2; step < 120; step++) {
      const y = sy + direction * step * LANE_STEP;
      if (free(y)) {
        lane = y;
        break search;
      }
    }
  }
  return {
    path: rounded([[sx, sy], [xa, sy], [xa, lane], [xb, lane], [xb, ty], [tx, ty]]),
    labelX: xa + Math.sign(xb - xa || 1) * Math.min(70, Math.abs(xb - xa) / 2),
    labelY: lane,
  };
}
