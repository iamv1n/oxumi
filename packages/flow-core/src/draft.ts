import { type Flow, type FlowIssue, FlowSchema, validateFlow } from "./schema";

// A flow as the builder holds it while it is being edited. It has the same
// shape as a Flow, except that a connection not yet drawn is an empty string
// (node.next, branch.default, branches[].next). Drafts are saved as they are;
// checkFlow says whether one is ready to take calls.
export type DraftFlow = Flow;

export type NodeLayout = Record<string, { x: number; y: number }>;

export interface FlowCheck {
  // The parsed flow when the draft is structurally complete, otherwise null.
  flow: Flow | null;
  issues: FlowIssue[];
}

interface LooseNode {
  id?: unknown;
  type?: unknown;
  next?: unknown;
  default?: unknown;
  branches?: { next?: unknown }[];
}

export function checkFlow(raw: unknown): FlowCheck {
  const issues: FlowIssue[] = [];
  const nodes = (raw as { nodes?: LooseNode[] } | null)?.nodes;

  // Unconnected outputs get a plain message instead of a schema error.
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      const id = String(node.id ?? "?");
      if (node.type === "branch") {
        if (node.default === "")
          issues.push({ level: "error", message: `"${id}" has no "otherwise" connection.` });
        node.branches?.forEach((branch, i) => {
          if (branch.next === "")
            issues.push({ level: "error", message: `"${id}" condition ${i + 1} is not connected.` });
        });
      } else if (node.type !== "end" && node.next === "") {
        issues.push({ level: "error", message: `"${id}" is not connected to a next step.` });
      }
    }
  }
  if (issues.length) return { flow: null, issues };

  const parsed = FlowSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      flow: null,
      issues: parsed.error.issues.map((issue) => ({
        level: "error" as const,
        message: `${issue.path.join(".") || "flow"}: ${issue.message}`,
      })),
    };
  }
  return { flow: parsed.data, issues: validateFlow(parsed.data) };
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+|-+$/g, "");
  return slug || "agent";
}

// The smallest valid flow: greet, ask one thing, say goodbye.
export function blankFlow(name: string): DraftFlow {
  return {
    id: slugify(name),
    name,
    description: "",
    settings: {
      persona: "You are a polite assistant making a short, routine call.",
      languages: ["hi", "en"],
      maxAttempts: 2,
      maxDurationSec: 300,
    },
    variables: [],
    fields: [
      {
        name: "answer",
        type: "string",
        description: "What the person said",
        required: true,
      },
    ],
    start: "greeting",
    nodes: [
      {
        id: "greeting",
        type: "start",
        say: "Hello, this is an automated assistant calling with a quick question.",
        next: "ask_question",
      },
      {
        id: "ask_question",
        type: "ask",
        fields: ["answer"],
        guidance: "",
        next: "goodbye",
      },
      { id: "goodbye", type: "end", say: "Thank you. Goodbye.", outcome: "completed" },
    ],
  };
}
