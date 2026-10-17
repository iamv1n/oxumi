import { arc, circle, polar } from "./geometry";
import type { Concept, MarkArt } from "./types";

// Circuit: two nodes on a ring, joined by two branches. The flow leaves the
// first node both ways round and rejoins at the second.
//   r      radius of the ring the nodes sit on
//   w      branch weight
//   node   node radius
//   clear  space between a node and the end of a branch
export function drawCircuit({ r, w, node, clear }: { r: number; w: number; node: number; clear: number }): MarkArt {
  const c = 16;
  // Start at lower left, finish at upper right.
  const start = 135;
  const finish = -45;
  // The branches end in round caps, so the trim is measured to the cap's tip.
  const trim = ((node + clear + w / 2) / r) * (180 / Math.PI);
  const [ax, ay] = polar(c, c, r, start);
  const [bx, by] = polar(c, c, r, finish);
  return {
    shapes: [
      { kind: "stroke", d: arc(c, c, r, start + trim, finish + 360 - trim), width: w, cap: "round" },
      { kind: "stroke", d: arc(c, c, r, start - trim, finish + trim), width: w, cap: "round" },
      { kind: "fill", d: circle(ax, ay, node) },
      { kind: "fill", d: circle(bx, by, node) },
    ],
    gradient: { x1: 6, y1: 26, x2: 26, y2: 6 },
  };
}

export const circuit: Concept = {
  id: "circuit",
  name: "Circuit",
  idea: "A flow reduced to its grammar: one node, two branches, a rejoin. The loop they make is the O.",
  rationale:
    "Every Oxumi flow is this sentence: start, branch on what was said, rejoin, finish. Drawn with two nodes and two branches it closes into an O by itself. The nodes sit on the diagonal so the mark leans forward, from a saffron start to a violet finish, and the same picture is a caller and a callee with a line each way.",
  weaknesses: [
    "Still half a diagram: dots on a ring are the visual language of n8n, Ubuntu and every sync icon.",
    "Four small pieces and four gaps. At 16px the gaps are under a pixel and the nodes blur into the ring.",
    "Round ends and round nodes make it friendly, even cute; the brief asks for precise and calm.",
  ],
  mark: drawCircuit({ r: 9.8, w: 4, node: 4.3, clear: 1.5 }),
  small: drawCircuit({ r: 9.4, w: 4.6, node: 4.8, clear: 1.5 }),
  wordmark: { kind: "text", face: "sans", text: "oxumi", weight: 600, em: 2.02, tracking: "-0.035em", shift: -0.045 },
  wordmarkWhy:
    "Lowercase Geist semibold: the mark speaks to builders, and so does the face they already read in the product and in a package name.",
  motion: "Both branches draw at once, the way a flow runs, then the nodes settle in.",
  scores: { distinct: 2, meaning: 4, favicon: 2, balance: 4, lockup: 3, mono: 4, motion: 5 },
};
