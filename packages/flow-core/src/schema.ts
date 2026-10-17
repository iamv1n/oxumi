import { z } from "zod";

// A flow is the unit a designer builds: a graph of nodes that describes one
// kind of call. This file is the single definition of that format; the file
// loader, the engine and (later) the visual designer all read and write it.

const ident = z.string().regex(/^[a-z][a-z0-9_]*$/, "use lower_snake_case");

export const OUTCOMES = [
  "completed",
  "partial",
  "callback_requested",
  "wrong_person",
  "opted_out",
  "transferred",
  "failed",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const FieldSchema = z.object({
  name: ident,
  type: z.enum(["string", "number", "boolean", "enum"]),
  description: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  required: z.boolean().default(true),
});
export type Field = z.infer<typeof FieldSchema>;

export const ConditionSchema = z.object({
  field: ident,
  op: z.enum(["eq", "neq", "in", "known"]),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .optional(),
});
export type Condition = z.infer<typeof ConditionSchema>;

const StartNode = z.object({
  id: ident,
  type: z.literal("start"),
  say: z.string().min(1),
  next: ident,
});
const SayNode = z.object({
  id: ident,
  type: z.literal("say"),
  say: z.string().min(1),
  next: ident,
});
const AskNode = z.object({
  id: ident,
  type: z.literal("ask"),
  fields: z.array(ident).min(1),
  guidance: z.string().default(""),
  maxAttempts: z.number().int().min(1).optional(),
  next: ident,
});
const BranchNode = z.object({
  id: ident,
  type: z.literal("branch"),
  branches: z
    .array(z.object({ when: ConditionSchema, next: ident }))
    .min(1),
  default: ident,
});
// Hands the call to a person. `to` is a phone number in international format
// or a {{variable}} that holds one. If the transfer cannot happen (a test
// call, a provider that cannot transfer, nobody picks up), the call carries
// on at `next`.
const TransferNode = z.object({
  id: ident,
  type: z.literal("transfer"),
  say: z.string().min(1),
  to: z.string().min(1),
  next: ident,
});
const EndNode = z.object({
  id: ident,
  type: z.literal("end"),
  say: z.string().min(1),
  outcome: z.enum(OUTCOMES).default("completed"),
});

export const NodeSchema = z.discriminatedUnion("type", [
  StartNode,
  SayNode,
  AskNode,
  BranchNode,
  TransferNode,
  EndNode,
]);
export type FlowNode = z.infer<typeof NodeSchema>;
export type AskNode = z.infer<typeof AskNode>;
export type TransferNode = z.infer<typeof TransferNode>;

export const FlowSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "use lower-kebab-case"),
  name: z.string().min(1),
  description: z.string().default(""),
  settings: z.object({
    persona: z.string().min(1),
    languages: z.array(z.enum(["hi", "en"])).min(1),
    voiceId: z.string().optional(),
    maxAttempts: z.number().int().min(1).default(2),
    maxDurationSec: z.number().int().min(30).default(300),
    // Where to send a caller who asks for a person at any point. Without it
    // the agent says it will pass the request on and carries on.
    handoff: z.object({ to: z.string().min(1) }).optional(),
  }),
  variables: z
    .array(
      z.object({
        name: ident,
        description: z.string().default(""),
        example: z.string().optional(),
      }),
    )
    .default([]),
  fields: z.array(FieldSchema).min(1),
  start: ident,
  nodes: z.array(NodeSchema).min(2),
});
export type Flow = z.infer<typeof FlowSchema>;

export interface FlowIssue {
  level: "error" | "warning";
  message: string;
}

const TEMPLATE_VAR = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
// International format: a plus sign, country code, then the number.
export const PHONE_NUMBER = /^\+[1-9]\d{7,14}$/;
// A transfer target: a number, or one {{variable}} that will hold one.
const TRANSFER_TARGET = /^(\+[1-9]\d{7,14}|\{\{\s*[a-z][a-z0-9_]*\s*\}\})$/;

function nextIds(node: FlowNode): string[] {
  switch (node.type) {
    case "branch":
      return [...node.branches.map((b) => b.next), node.default];
    case "end":
      return [];
    default:
      return [node.next];
  }
}

// Checks that zod cannot express: references, reachability, dead data.
export function validateFlow(flow: Flow): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warning", message });

  const nodes = new Map<string, FlowNode>();
  for (const node of flow.nodes) {
    if (nodes.has(node.id)) error(`Duplicate node id "${node.id}".`);
    nodes.set(node.id, node);
  }
  const fields = new Map(flow.fields.map((f) => [f.name, f]));
  if (fields.size !== flow.fields.length) error("Duplicate field name.");
  const variables = new Set(flow.variables.map((v) => v.name));

  const startNode = nodes.get(flow.start);
  if (!startNode) error(`Start node "${flow.start}" does not exist.`);
  else if (startNode.type !== "start")
    error(`"${flow.start}" must be a start node.`);

  for (const field of flow.fields) {
    if (field.type === "enum" && !field.options?.length)
      error(`Field "${field.name}" is an enum with no options.`);
  }

  const collected = new Set<string>();
  for (const node of flow.nodes) {
    for (const target of nextIds(node)) {
      if (!nodes.has(target))
        error(`Node "${node.id}" points to missing node "${target}".`);
    }
    if (node.type === "ask") {
      for (const name of node.fields) {
        if (!fields.has(name))
          error(`Node "${node.id}" asks for unknown field "${name}".`);
        collected.add(name);
      }
    }
    if (node.type === "branch") {
      for (const { when } of node.branches) {
        if (!fields.has(when.field))
          error(`Node "${node.id}" branches on unknown field "${when.field}".`);
        if (when.op !== "known" && when.value === undefined)
          error(`Node "${node.id}" has a "${when.op}" condition with no value.`);
      }
    }
    if (node.type === "transfer") {
      if (!TRANSFER_TARGET.test(node.to.replace(/[\s()-]/g, "")))
        error(`Node "${node.id}" must transfer to a number like +919876543210 or a {{variable}}.`);
      for (const match of node.to.matchAll(TEMPLATE_VAR)) {
        if (!variables.has(match[1]!))
          error(`Node "${node.id}" transfers to undeclared variable "${match[1]}".`);
      }
    }
    const spoken = "say" in node ? node.say : node.type === "ask" ? node.guidance : "";
    if (spoken) {
      for (const match of spoken.matchAll(TEMPLATE_VAR)) {
        if (!variables.has(match[1]!))
          error(`Node "${node.id}" uses undeclared variable "${match[1]}".`);
      }
    }
  }

  const reachable = new Set<string>();
  const stack = [flow.start];
  while (stack.length) {
    const id = stack.pop()!;
    const node = nodes.get(id);
    if (!node || reachable.has(id)) continue;
    reachable.add(id);
    stack.push(...nextIds(node));
  }
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) warn(`Node "${node.id}" is unreachable.`);
  }
  const handoff = flow.settings.handoff?.to;
  if (handoff !== undefined) {
    if (!TRANSFER_TARGET.test(handoff.replace(/[\s()-]/g, "")))
      error("The hand-off number must look like +919876543210 or be a {{variable}}.");
    for (const match of handoff.matchAll(TEMPLATE_VAR)) {
      if (!variables.has(match[1]!))
        error(`The hand-off number uses undeclared variable "${match[1]}".`);
    }
  }
  if (![...reachable].some((id) => nodes.get(id)?.type === "end"))
    error("No end node is reachable from the start.");
  for (const field of flow.fields) {
    if (!collected.has(field.name))
      warn(`Field "${field.name}" is never asked for.`);
  }
  return issues;
}

export function parseFlow(raw: unknown): { flow: Flow; issues: FlowIssue[] } {
  const flow = FlowSchema.parse(raw);
  return { flow, issues: validateFlow(flow) };
}

export function renderTemplate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(TEMPLATE_VAR, (_, name: string) => variables[name] ?? "");
}
