import { Logger } from "@nestjs/common";
import { type OnGatewayConnection, WebSocketGateway } from "@nestjs/websockets";
import type { IncomingMessage } from "node:http";
import type WebSocket from "ws";
import { AgentsService } from "../agents/agents.service";
import { AuthService, readCookie, SESSION_COOKIE } from "../auth/auth.service";
import { ComplianceService } from "../compliance/compliance.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { LlmRegistry } from "../llm/registry";
import { CallSession } from "../runtime/call-session";
import { BrowserTransport } from "../runtime/transport";
import { SpeechRegistry } from "../speech/registry";
import { CallsService } from "./calls.service";

interface StartMessage {
  type: "start";
  agentId: string;
  mode: "voice" | "text";
  variables?: Record<string, string>;
  // "<provider>:<model>"; the server default is used when omitted.
  model?: string;
}

// Browser calls. The first message picks the agent; after that the socket
// carries microphone audio in and agent audio plus events out.
@WebSocketGateway({ path: "/ws/call" })
export class CallsGateway implements OnGatewayConnection {
  private logger = new Logger(CallsGateway.name);

  constructor(
    private agents: AgentsService,
    private auth: AuthService,
    private calls: CallsService,
    private llm: LlmRegistry,
    private speech: SpeechRegistry,
    private compliance: ComplianceService,
    private knowledge: KnowledgeService,
  ) {}

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    // The browser sends the session cookie with the socket handshake.
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    client.once("message", (data: Buffer) => {
      this.begin(client, data, token).catch((err: Error) => {
        this.logger.warn(`Call rejected: ${err.message}`);
        client.send(JSON.stringify({ type: "error", message: err.message }));
        client.close();
      });
    });
  }

  private async begin(
    client: WebSocket,
    data: Buffer,
    token: string | undefined,
  ): Promise<void> {
    const user = await this.auth.userForToken(token);
    if (!user) throw new Error("Sign in to start a call.");
    const start = JSON.parse(data.toString()) as StartMessage;
    if (start.type !== "start") throw new Error("Expected a start message.");

    const agent = await this.agents.find(start.agentId, user.id, "editor");
    const { flow, issues } = this.agents.check(agent);
    const blocking = issues.find((issue) => issue.level === "error");
    if (!flow || blocking)
      throw new Error(`This agent's flow is not ready: ${blocking?.message}`);

    const variables = start.variables ?? {};
    const missing = flow.variables.filter((v) => !variables[v.name]?.trim());
    if (missing.length) {
      throw new Error(
        `Missing variables: ${missing.map((v) => v.name).join(", ")}`,
      );
    }
    const voice = start.mode === "voice";
    const speech = voice
      ? await this.speech.forProject(agent.projectId, agent.speech || undefined)
      : null;
    if (voice && !speech) {
      throw new Error(
        "No speech provider is connected. Add an ElevenLabs or Sarvam key under Integrations, or use text mode.",
      );
    }

    const { ref: model, llm } = await this.llm.resolve(
      agent.projectId,
      start.model || agent.model,
    );
    const call = await this.calls.create(
      agent,
      voice ? "browser_voice" : "browser_text",
      variables,
      model,
    );
    const rules = await this.compliance.rules(agent.projectId);
    const useKnowledge = agent.knowledge && (await this.knowledge.hasSources(agent.projectId));
    const transport = new BrowserTransport(client);
    transport.sendEvent({ type: "ready", callId: call.id });
    new CallSession({
      flow,
      variables,
      llm,
      speech,
      transport,
      recorder: this.calls.recorder(call.id),
      preamble: rules.disclosure,
      instantOpening: voice,
      // The agent finishes its sentence; the caller is answered right after.
      bargeIn: voice ? false : undefined,
      knowledge: useKnowledge
        ? (question) => this.knowledge.lookup(agent.projectId, question)
        : undefined,
      // Nobody is dialled from a test call; the hand-off is shown instead.
      transfer: async () => ({ ok: true, status: "simulated" }),
    }).start();
  }
}
