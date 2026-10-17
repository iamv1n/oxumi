import type { CallState, FieldValue, Outcome } from "@oxumi/flow-core";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AgentsService } from "../agents/agents.service";
import { CallsService } from "../calls/calls.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { LlmRegistry } from "../llm/registry";
import type { CallRecorder } from "../runtime/call-session";
import { Conversation, type TurnInput } from "../runtime/conversation";
import type { AuthenticatedKey } from "./api-keys.service";

export interface ApiTurn {
  callId: string;
  // What the agent says next.
  reply: string;
  fields: Record<string, FieldValue>;
  // The flow step the call is now on.
  step: string;
  ended: boolean;
  outcome: Outcome | null;
}

interface LiveCall {
  projectId: string;
  conversation: Conversation;
  recorder: CallRecorder;
  turns: number;
  busy: boolean;
  lastActive: number;
}

const IDLE_MS = 15 * 60 * 1000;

// Text conversations driven over HTTP: another system relays what a person
// typed (a chat widget, a WhatsApp bot) and gets the agent's next line back.
// The same flow engine and recording as browser calls.
@Injectable()
export class ApiCallsService implements OnModuleDestroy {
  // Conversations in progress. In memory: a call must continue on the server
  // that started it, and is lost on restart.
  private live = new Map<string, LiveCall>();
  private sweeper = setInterval(() => this.sweep(), 60_000);

  constructor(
    private agents: AgentsService,
    private calls: CallsService,
    private llm: LlmRegistry,
    private knowledge: KnowledgeService,
  ) {
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  async start(
    key: AuthenticatedKey,
    input: { agentId?: unknown; variables?: unknown; model?: unknown },
  ): Promise<ApiTurn> {
    if (typeof input.agentId !== "string")
      throw new BadRequestException("agentId is required.");
    const agent = await this.agents.find(input.agentId, key.ownerId);
    if (agent.projectId !== key.projectId) throw new NotFoundException("Agent not found.");

    const { flow, issues } = this.agents.check(agent);
    const blocking = issues.find((issue) => issue.level === "error");
    if (!flow || blocking)
      throw new UnprocessableEntityException(
        `This agent's flow is not ready: ${blocking?.message}`,
      );

    const variables = isStringRecord(input.variables) ? input.variables : {};
    const missing = flow.variables.filter((v) => !variables[v.name]?.trim());
    if (missing.length)
      throw new BadRequestException(
        `Missing variables: ${missing.map((v) => v.name).join(", ")}`,
      );

    const { ref: model, llm } = await this.llm.resolve(
      key.projectId,
      (typeof input.model === "string" && input.model) || agent.model,
    );
    const call = await this.calls.create(agent, "api_text", variables, model);
    const live: LiveCall = {
      projectId: key.projectId,
      conversation: new Conversation(flow, variables, llm, {
        knowledge:
          agent.knowledge && (await this.knowledge.hasSources(key.projectId))
            ? (question) => this.knowledge.lookup(key.projectId, question)
            : undefined,
      }),
      recorder: this.calls.recorder(call.id),
      turns: 0,
      busy: false,
      lastActive: Date.now(),
    };
    this.live.set(call.id, live);
    return this.turn(call.id, live, { kind: "connected" });
  }

  async message(
    key: AuthenticatedKey,
    callId: string,
    input: { text?: unknown },
  ): Promise<ApiTurn> {
    const text = typeof input.text === "string" ? input.text.trim() : "";
    if (!text) throw new BadRequestException("text is required.");
    const live = this.live.get(callId);
    if (!live || live.projectId !== key.projectId)
      throw new GoneException("This call has ended or expired. Start a new one.");
    if (live.busy)
      throw new ConflictException("The previous message is still being answered.");
    return this.turn(callId, live, { kind: "caller", text });
  }

  async end(key: AuthenticatedKey, callId: string): Promise<void> {
    const live = this.live.get(callId);
    if (!live || live.projectId !== key.projectId) return;
    await this.close(callId, live);
  }

  private async turn(callId: string, live: LiveCall, input: TurnInput): Promise<ApiTurn> {
    live.busy = true;
    live.lastActive = Date.now();
    const started = Date.now();
    let firstText: number | null = null;
    try {
      const output = await live.conversation.respond(input, {
        signal: new AbortController().signal,
        onText: () => (firstText ??= Date.now()),
      });
      await live.recorder.turn({
        index: ++live.turns,
        callerText: input.kind === "caller" ? input.text : null,
        agentText: output.text,
        interrupted: false,
        nodeId: output.state.nodeId,
        llmMs: firstText === null ? null : firstText - started,
        audioMs: null,
      });
      if (output.state.ended) await this.close(callId, live);
      return describe(callId, output.text, output.state);
    } catch (err) {
      await this.close(callId, live, "failed");
      throw new BadGatewayException(
        `The language model could not be reached: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      live.busy = false;
    }
  }

  private async close(callId: string, live: LiveCall, forced?: Outcome): Promise<void> {
    if (!this.live.delete(callId)) return;
    const { state } = live.conversation;
    await live.recorder.finish({
      outcome:
        forced ?? state.outcome ?? (Object.keys(state.fields).length ? "partial" : "failed"),
      fields: state.fields,
    });
  }

  private sweep(): void {
    const cutoff = Date.now() - IDLE_MS;
    for (const [callId, live] of this.live) {
      if (!live.busy && live.lastActive < cutoff) void this.close(callId, live);
    }
  }
}

function describe(callId: string, reply: string, state: CallState): ApiTurn {
  return {
    callId,
    reply,
    fields: state.fields,
    step: state.nodeId,
    ended: state.ended,
    outcome: state.outcome ?? null,
  };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}
