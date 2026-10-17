import {
  checkFlow,
  type DraftFlow,
  type Flow,
  FlowSchema,
  type FlowIssue,
  slugify,
} from "@oxumi/flow-core";
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import { AgentsService } from "../agents/agents.service";
import { FlowsService } from "../flows/flows.service";
import { LlmRegistry } from "../llm/registry";
import type { LlmMessage, LlmTool } from "../llm/types";
import { ProjectsService } from "../projects/projects.service";

// Writes or rewrites a call flow from a plain-language brief, using the
// project's own language model. The result is a proposal: nothing is saved
// here; the app shows it and saves it through the normal agent update.

const TOOL_NAME = "submit_flow";
const MAX_PROMPT = 4000;
// The first answer plus this many rounds of "here is what is wrong, fix it".
const REPAIR_ROUNDS = 2;
const TIMEOUT_MS = 150_000;

export interface FlowProposal {
  flow: DraftFlow;
  issues: FlowIssue[];
  // What the model built or changed, in a sentence or two, for the person.
  summary: string;
  // False when errors remain after the repair rounds; the builder can still
  // open it and show them.
  valid: boolean;
  model: string;
}

// The tool input: the whole flow, plus a short account of it. Derived from
// the schema the engine runs, so the model is asked for exactly that shape.
const TOOL: LlmTool = {
  name: TOOL_NAME,
  description:
    "Submit the complete call flow. Always send the whole flow, never a fragment or a diff.",
  inputSchema: (() => {
    const { $schema: _drop, ...flow } = z.toJSONSchema(FlowSchema, {
      io: "input",
      unrepresentable: "any",
    }) as Record<string, unknown>;
    return {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "One or two plain sentences for the user: what the flow does, or what you changed.",
        },
        flow,
      },
      required: ["summary", "flow"],
    };
  })(),
};

const SYSTEM = `You design call flows for Oxumi, a platform where an AI voice agent phones people, follows a flow, and records structured answers. You turn a user's brief into a complete flow and submit it with the ${TOOL_NAME} tool.

How a flow runs:
- The call begins at the node named by "start", which must be a "start" node. Its "say" is the opening line: who is calling and why.
- "say" speaks a line and moves to "next".
- "ask" collects one or more fields (declared in "fields") in conversation, re-asking up to maxAttempts times, then moves to "next". "guidance" tells the agent how to ask: tone, what counts as an answer, what not to promise. Prefer one field per ask unless the answers naturally come together.
- "branch" checks collected fields in order and goes to the first matching branch's "next", otherwise to "default". Conditions: {"field", "op": "eq"|"neq"|"in"|"known", "value"}. Use "eq"/"in" against enum options exactly as written; "known" means the caller gave any answer.
- "transfer" says a line and hands the call to a person at "to" (an E.164 number like +919876543210 or a single {{variable}}); "next" is where the call continues if nobody can take it.
- "end" says a closing line and ends with an outcome: completed, partial, callback_requested, wrong_person, opted_out, transferred or failed. Give each distinct ending its own end node with the right outcome.
- The language model speaks every line in its own words, in the call's languages, so write lines in clear natural English; the agent adapts them to Hindi when the caller uses it.

Data:
- "variables" are facts known before the call (customer name, order id, appointment time). Reference them in text as {{name}}. Declare every variable you reference, with a description and a realistic example.
- "fields" are what the call collects. Types: string, number, boolean, enum (enum needs "options", lower_snake_case values). Write a precise description: it is what the agent uses to judge an answer. Set "required": false for optional answers.

Rules:
- Ids, field names, variable names and enum options are lower_snake_case. The flow "id" is lower-kebab-case.
- Every node is reachable from start, every path reaches an end node, every field is asked for somewhere, and every "next"/"default" names an existing node.
- Handle the realistic detours a real call meets: the wrong person answering, the person being busy (offer a callback), and refusals, when they matter to the brief. Keep the flow as small as the brief allows; do not pad it.
- "settings.persona" says who the agent is and how it behaves, including what it must never do (medical, legal or financial advice, promises the business has not made). "settings.languages" is ["hi","en"] unless the brief says otherwise; the first is the opening language. Keep maxDurationSec realistic (120 to 600).
- Only set "settings.handoff" or use "transfer" nodes when the brief gives a number or a variable for one.
- When you are given a current flow, change only what the request asks for and keep everything else, including node ids, as it was.

Call ${TOOL_NAME} exactly once with the complete flow. Do not reply with the flow as text.`;

@Injectable()
export class FlowAiService {
  private logger = new Logger(FlowAiService.name);

  constructor(
    private llm: LlmRegistry,
    private projects: ProjectsService,
    private agents: AgentsService,
    private templates: FlowsService,
  ) {}

  async generate(
    projectId: string,
    userId: string,
    input: {
      prompt?: unknown;
      agentId?: unknown;
      // A proposal to refine further; takes the place of the agent's flow.
      flow?: unknown;
      name?: unknown;
      model?: unknown;
    },
  ): Promise<FlowProposal> {
    await this.projects.get(projectId, userId, "editor");
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    if (!prompt) throw new BadRequestException("Describe the call you want, or the change to make.");
    if (prompt.length > MAX_PROMPT)
      throw new BadRequestException(`Keep the description under ${MAX_PROMPT} characters.`);

    let current: DraftFlow | null = null;
    let name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : "";
    if (typeof input.agentId === "string" && input.agentId) {
      const agent = await this.agents.find(input.agentId, userId, "editor");
      if (agent.projectId !== projectId) throw new BadRequestException("That agent is in another project.");
      current = agent.flow;
      name = agent.name;
    }
    if (typeof input.flow === "object" && input.flow !== null && Array.isArray((input.flow as DraftFlow).nodes))
      current = input.flow as DraftFlow;

    const { ref, llm } = await this.llm.resolve(
      projectId,
      typeof input.model === "string" ? input.model : undefined,
    );
    const messages: LlmMessage[] = [{ role: "user", text: this.brief(prompt, current, name) }];
    const signal = AbortSignal.timeout(TIMEOUT_MS);

    let last: { flow: DraftFlow; issues: FlowIssue[]; summary: string } | null = null;
    for (let round = 0; round <= REPAIR_ROUNDS; round++) {
      const result = await llm
        .runTurn({ system: SYSTEM, messages, tool: TOOL, signal, onText: () => {} })
        .catch((err: Error) => {
          this.logger.warn(`Flow generation on ${ref} failed: ${err.message}`);
          throw new ServiceUnavailableException(
            signal.aborted
              ? "The model took too long. Try a shorter description or a faster model."
              : `The model could not be reached: ${err.message}`,
          );
        });
      if (result.refused)
        throw new BadRequestException("The model declined this request. Try rewording the description.");
      messages.push({ role: "assistant", text: result.text, raw: result.raw });

      const submitted = parseSubmission(result.toolCall?.input);
      if (!result.toolCall || !submitted) {
        messages.push({
          role: "user",
          text: `Call ${TOOL_NAME} with {"summary", "flow"}, where flow is the complete flow object.`,
          ...(result.toolCall
            ? { toolResult: { id: result.toolCall.id, content: "Rejected: input must be {summary, flow}." } }
            : {}),
        });
        continue;
      }

      // Named after the agent, as AgentsService.check runs it.
      const flow = {
        ...(submitted.flow as DraftFlow),
        id: slugify(name || String((submitted.flow as Flow).name ?? "agent")),
        name: name || String((submitted.flow as Flow).name ?? "Agent"),
      };
      const { issues, flow: parsed } = checkFlow(flow);
      const errors = issues.filter((issue) => issue.level === "error");
      // The parsed copy has zod's defaults filled in; prefer it when there is one.
      last = { flow: parsed ?? flow, issues, summary: submitted.summary };
      if (!errors.length) return { ...last, valid: true, model: ref };

      messages.push({
        role: "user",
        toolResult: { id: result.toolCall.id, content: `Rejected: ${errors.length} problem(s).` },
        text: `The flow has these problems:\n${errors
          .map((e) => `- ${e.message}`)
          .join("\n")}\nFix them and call ${TOOL_NAME} again with the complete corrected flow.`,
      });
    }

    if (!last)
      throw new ServiceUnavailableException(
        "The model didn't return a flow. Try again, or pick a different model.",
      );
    return { ...last, valid: false, model: ref };
  }

  private brief(prompt: string, current: DraftFlow | null, name: string): string {
    const example = this.templates.list()[0]?.flow;
    const parts = [
      example
        ? `<example_flow>\nA well-formed flow, for reference only:\n${JSON.stringify(example)}\n</example_flow>`
        : "",
      current
        ? `<current_flow>\n${JSON.stringify(current)}\n</current_flow>\n\nChange this flow as follows:\n${prompt}`
        : `Design a new call flow${name ? ` for an agent called "${name}"` : ""}:\n${prompt}`,
    ];
    return parts.filter(Boolean).join("\n\n");
  }
}

function parseSubmission(input: unknown): { summary: string; flow: Record<string, unknown> } | null {
  if (typeof input !== "object" || input === null) return null;
  const { summary, flow } = input as { summary?: unknown; flow?: unknown };
  // Some models send the nested object as a JSON string.
  const object = typeof flow === "string" ? safeJson(flow) : flow;
  if (typeof object !== "object" || object === null || !Array.isArray((object as { nodes?: unknown }).nodes))
    return null;
  return { summary: typeof summary === "string" ? summary : "", flow: object as Record<string, unknown> };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
