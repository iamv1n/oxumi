import type { DraftFlow, FlowIssue, FlowNode } from "@oxumi/flow-core";

// Where the flow's steps refer to a field or a variable.
export interface Usage {
  nodeId: string;
  kind: FlowNode["type"];
  how: "asks" | "branches" | "mentions";
}

export const USAGE_VERB: Record<Usage["how"], string> = {
  asks: "asks for it",
  branches: "branches on it",
  mentions: "mentions it",
};

const TEMPLATE_VAR = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

function add(map: Map<string, Usage[]>, name: string, usage: Usage) {
  const list = map.get(name) ?? [];
  if (!list.some((u) => u.nodeId === usage.nodeId && u.how === usage.how)) list.push(usage);
  map.set(name, list);
}

// Fields used by ask steps (collected) and branch conditions (read).
export function fieldUsage(flow: DraftFlow): Map<string, Usage[]> {
  const map = new Map<string, Usage[]>();
  for (const node of flow.nodes ?? []) {
    if (node.type === "ask") {
      for (const name of node.fields ?? [])
        add(map, name, { nodeId: node.id, kind: node.type, how: "asks" });
    } else if (node.type === "branch") {
      for (const branch of node.branches ?? [])
        if (branch.when?.field)
          add(map, branch.when.field, { nodeId: node.id, kind: node.type, how: "branches" });
    }
  }
  return map;
}

// Variables written as {{name}} in what a step says or in its guidance.
export function variableUsage(flow: DraftFlow): Map<string, Usage[]> {
  const map = new Map<string, Usage[]>();
  for (const node of flow.nodes ?? []) {
    const text = node.type === "ask" ? node.guidance : node.type === "branch" ? "" : node.say;
    for (const match of (text ?? "").matchAll(TEMPLATE_VAR))
      add(map, match[1]!, { nodeId: node.id, kind: node.type, how: "mentions" });
  }
  return map;
}

// Validation issues that are about variables or fields rather than the graph.
export function dataIssues(issues: FlowIssue[]): FlowIssue[] {
  return issues.filter((issue) =>
    /\b(field|fields|variable|variables|enum)\b/i.test(issue.message),
  );
}

export const IDENT = /^[a-z][a-z0-9_]*$/;

// Nudges typing towards lower_snake_case without fighting the cursor.
export function toIdent(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
