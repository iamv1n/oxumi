import type { Condition, Field, FlowIssue, FlowNode, NodeLayout } from "@oxumi/flow-core";

// Pure helpers over the part of an agent the builder owns: the nodes, which
// one starts the call, and where each sits on the canvas. Every edit is a
// function from one Doc to the next, so history and saving stay trivial.

export interface Doc {
  nodes: FlowNode[];
  start: string;
  layout: NodeLayout;
}

export type NodeKind = FlowNode["type"];
export type AddableKind = Exclude<NodeKind, "start">;
export const ADDABLE_KINDS: AddableKind[] = ["say", "ask", "branch", "transfer", "end"];

export const NODE_WIDTH = 260;
export const IDENT = /^[a-z][a-z0-9_]*$/;

// ---- Outputs --------------------------------------------------------------

// A node's outputs, in the order they are drawn. The handle id is stable for
// as long as the node's shape is: "next", "default", or "b<index>".
export interface Output {
  handle: string;
  target: string;
  // Set on branch outputs: the condition, or null for "otherwise".
  when?: Condition | null;
}

export const branchHandle = (index: number) => `b${index}`;
export const DEFAULT_HANDLE = "default";
export const NEXT_HANDLE = "next";

export function outputsOf(node: FlowNode): Output[] {
  switch (node.type) {
    case "end":
      return [];
    case "branch":
      return [
        ...node.branches.map((branch, i) => ({
          handle: branchHandle(i),
          target: branch.next,
          when: branch.when,
        })),
        { handle: DEFAULT_HANDLE, target: node.default, when: null },
      ];
    default:
      return [{ handle: NEXT_HANDLE, target: node.next }];
  }
}

export const edgeId = (source: string, handle: string) => `${source}:${handle}`;

function setOutput(node: FlowNode, handle: string, target: string): FlowNode {
  if (node.type === "end") return node;
  if (node.type === "branch") {
    if (handle === DEFAULT_HANDLE) return { ...node, default: target };
    const index = Number(handle.slice(1));
    if (!handle.startsWith("b") || !node.branches[index]) return node;
    return {
      ...node,
      branches: node.branches.map((b, i) => (i === index ? { ...b, next: target } : b)),
    };
  }
  return handle === NEXT_HANDLE ? { ...node, next: target } : node;
}

function mapTargets(node: FlowNode, fn: (target: string) => string): FlowNode {
  let next = node;
  for (const out of outputsOf(node)) {
    const mapped = fn(out.target);
    if (mapped !== out.target) next = setOutput(next, out.handle, mapped);
  }
  return next;
}

// ---- Edits ----------------------------------------------------------------

export function connect(doc: Doc, source: string, handle: string, target: string): Doc {
  return {
    ...doc,
    nodes: doc.nodes.map((n) => (n.id === source ? setOutput(n, handle, target) : n)),
  };
}

export function disconnect(doc: Doc, links: { source: string; handle: string }[]): Doc {
  let next = doc;
  for (const link of links) next = connect(next, link.source, link.handle, "");
  return next;
}

export function updateNode<T extends FlowNode>(
  doc: Doc,
  id: string,
  fn: (node: T) => T,
): Doc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === id ? fn(n as T) : n)) };
}

// Removes nodes (never the start node) and clears every connection to them.
export function removeNodes(doc: Doc, ids: string[]): Doc {
  const gone = new Set(ids.filter((id) => id !== doc.start));
  if (!gone.size) return doc;
  const layout = { ...doc.layout };
  for (const id of gone) delete layout[id];
  return {
    ...doc,
    layout,
    nodes: doc.nodes
      .filter((n) => !gone.has(n.id))
      .map((n) => mapTargets(n, (t) => (gone.has(t) ? "" : t))),
  };
}

export function renameError(doc: Doc, from: string, to: string): string | null {
  if (!to) return "An id is required.";
  if (!IDENT.test(to))
    return "Use lowercase letters, numbers and underscores, starting with a letter.";
  if (to !== from && doc.nodes.some((n) => n.id === to))
    return `Another step is already called "${to}".`;
  return null;
}

// Renames a node and everything that refers to it.
export function renameNode(doc: Doc, from: string, to: string): Doc {
  if (from === to || renameError(doc, from, to)) return doc;
  const layout: NodeLayout = {};
  for (const [id, pos] of Object.entries(doc.layout)) layout[id === from ? to : id] = pos;
  return {
    start: doc.start === from ? to : doc.start,
    layout,
    nodes: doc.nodes.map((n) => {
      const renamed = n.id === from ? { ...n, id: to } : n;
      return mapTargets(renamed, (t) => (t === from ? to : t));
    }),
  };
}

export function uniqueId(doc: Doc, kind: NodeKind): string {
  const taken = new Set(doc.nodes.map((n) => n.id));
  for (let i = 1; ; i++) {
    const id = `${kind}_${i}`;
    if (!taken.has(id)) return id;
  }
}

export function defaultValue(field: Field | undefined, op: Condition["op"]): Condition["value"] {
  if (op === "known") return undefined;
  if (op === "in") return field?.type === "enum" && field.options?.[0] ? [field.options[0]] : [];
  switch (field?.type) {
    case "boolean":
      return true;
    case "number":
      return 0;
    case "enum":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
}

export function defaultCondition(fields: Field[], used: string[] = []): Condition {
  const field =
    fields.find((f) => (f.type === "boolean" || f.type === "enum") && !used.includes(f.name)) ??
    fields.find((f) => !used.includes(f.name)) ??
    fields[0];
  return { field: field?.name ?? "", op: "eq", value: defaultValue(field, "eq") };
}

export function createNode(doc: Doc, kind: AddableKind, fields: Field[]): FlowNode {
  const id = uniqueId(doc, kind);
  switch (kind) {
    case "say":
      return { id, type: "say", say: "", next: "" };
    case "ask": {
      const asked = new Set(doc.nodes.flatMap((n) => (n.type === "ask" ? n.fields : [])));
      const free = fields.find((f) => !asked.has(f.name));
      return { id, type: "ask", fields: free ? [free.name] : [], guidance: "", next: "" };
    }
    case "branch":
      return {
        id,
        type: "branch",
        branches: [{ when: defaultCondition(fields), next: "" }],
        default: "",
      };
    case "transfer":
      return {
        id,
        type: "transfer",
        say: "Please hold while I put you through to a colleague.",
        to: "",
        next: "",
      };
    case "end":
      return { id, type: "end", say: "Thank you for your time. Goodbye.", outcome: "completed" };
  }
}

export function addNode(doc: Doc, node: FlowNode, position: { x: number; y: number }): Doc {
  return {
    ...doc,
    nodes: [...doc.nodes, node],
    layout: { ...doc.layout, [node.id]: position },
  };
}

// ---- Plain language -------------------------------------------------------

export const OP_LABEL: Record<Condition["op"], string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  known: "is known",
};

function valueText(value: Condition["value"]): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "…";
  if (value === undefined || value === "") return "…";
  return String(value);
}

export function conditionParts(when: Condition): { field: string; op: string; value: string } {
  return {
    field: when.field || "…",
    op: OP_LABEL[when.op],
    value: when.op === "known" ? "" : valueText(when.value),
  };
}

export function conditionText(when: Condition): string {
  const { field, op, value } = conditionParts(when);
  return value ? `${field} ${op} ${value}` : `${field} ${op}`;
}

export const OUTCOME_LABEL: Record<string, string> = {
  completed: "Completed",
  partial: "Partial",
  callback_requested: "Callback requested",
  wrong_person: "Wrong person",
  opted_out: "Opted out",
  transferred: "Transferred",
  failed: "Failed",
};

// ---- Issues ---------------------------------------------------------------

export interface NodeIssue extends FlowIssue {
  // The node the issue is about, when it names one that exists.
  nodeId: string | null;
  // The message, reworded where the server's is a raw schema path.
  text: string;
}

const SCHEMA_TEXT: Record<string, string> = {
  say: "has nothing to say yet.",
  fields: "does not collect any field yet.",
  branches: "needs at least one condition.",
  to: "has no number to transfer to yet.",
  id: "has an invalid id.",
};

export function annotateIssues(issues: FlowIssue[], nodes: FlowNode[]): NodeIssue[] {
  const ids = new Set(nodes.map((n) => n.id));
  return issues.map((issue) => {
    // Schema errors arrive as "nodes.<index>.<path>: <reason>".
    const path = /^nodes\.(\d+)\.([a-zA-Z]+)[^:]*:\s*(.*)$/.exec(issue.message);
    if (path) {
      const node = nodes[Number(path[1])];
      if (node) {
        const known = SCHEMA_TEXT[path[2]!];
        return {
          ...issue,
          nodeId: node.id,
          text: known ? `"${node.id}" ${known}` : `"${node.id}" ${path[2]}: ${path[3]}`,
        };
      }
    }
    let nodeId: string | null = null;
    for (const match of issue.message.matchAll(/"([^"]+)"/g)) {
      if (ids.has(match[1]!)) {
        nodeId = match[1]!;
        break;
      }
    }
    return { ...issue, nodeId, text: issue.message };
  });
}

// ---- Comparison -----------------------------------------------------------

// JSON with sorted keys, so two copies of a document compare equal whatever
// order a database returned their keys in.
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(v).sort()) sorted[key] = (v as Record<string, unknown>)[key];
      return sorted;
    }
    return v;
  });
}
