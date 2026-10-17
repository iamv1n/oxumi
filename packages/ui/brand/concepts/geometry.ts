// Small helpers for writing path data by construction instead of by hand, so
// a radius or a weight can change without redrawing the mark.

const round = (n: number) => String(Math.round(n * 1000) / 1000);

export const pt = (x: number, y: number) => `${round(x)} ${round(y)}`;

// A point on a circle. Angles are in degrees, 0 pointing right, growing
// clockwise on screen (y runs down).
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// An open arc from `from` to `to` degrees; clockwise when `to` is larger.
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x0, y0] = polar(cx, cy, r, from);
  const [x1, y1] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M${pt(x0, y0)}A${round(r)} ${round(r)} 0 ${large} ${sweep} ${pt(x1, y1)}`;
}

// A full circle as a closed path (for a stroke it is a ring, for a fill a disc).
export function circle(cx: number, cy: number, r: number): string {
  return `M${pt(cx - r, cy)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0Z`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${pt(cx - rx, cy)}a${round(rx)} ${round(ry)} 0 1 0 ${round(2 * rx)} 0a${round(rx)} ${round(ry)} 0 1 0 ${round(-2 * rx)} 0Z`;
}

export const polygon = (points: ReadonlyArray<readonly [number, number]>) =>
  `M${points.map(([x, y]) => pt(x, y)).join("L")}Z`;

export { round };
