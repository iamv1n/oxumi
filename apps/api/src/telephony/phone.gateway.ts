import { Logger } from "@nestjs/common";
import { type OnGatewayConnection, WebSocketGateway } from "@nestjs/websockets";
import type { IncomingMessage } from "node:http";
import type WebSocket from "ws";
import { AgentsService } from "../agents/agents.service";
import { CallsService } from "../calls/calls.service";
import { ComplianceService } from "../compliance/compliance.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { CallSession } from "../runtime/call-session";
import type { Transport } from "../runtime/transport";
import { ExotelTransport } from "./exotel-transport";
import { PhoneService, type TelephonyId } from "./phone.service";
import { TwilioTransport } from "./twilio-transport";
import { STREAM_PATH } from "./vobiz";
import { VobizTransport } from "./vobiz-transport";

// What each provider's "start" message tells us, in one shape.
interface StreamStart {
  streamSid: string;
  callId: string;
  token: string;
}

const START_TIMEOUT_MS = 10_000;

// Where a phone call's audio connects once it has been answered. From here
// the call runs through the same session as a browser call.
abstract class PhoneStreamGateway implements OnGatewayConnection {
  protected abstract provider: TelephonyId;
  private logger = new Logger(PhoneStreamGateway.name);

  constructor(
    private phone: PhoneService,
    private calls: CallsService,
    private compliance: ComplianceService,
    private knowledge: KnowledgeService,
    private agents: AgentsService,
  ) {}

  protected abstract parseStart(
    msg: Record<string, any>,
    request: IncomingMessage,
  ): StreamStart | null;
  protected abstract transport(client: WebSocket, streamSid: string): Transport;

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    // Providers send "connected" then "start"; anything else never becomes a call.
    const timeout = setTimeout(() => client.close(), START_TIMEOUT_MS);
    const onMessage = (raw: Buffer) => {
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.event !== "start") return;
      clearTimeout(timeout);
      client.off("message", onMessage);
      this.begin(client, this.parseStart(msg, request)).catch((err: Error) => {
        this.logger.warn(`${this.provider} stream rejected: ${err.message}`);
        client.close();
      });
    };
    client.on("message", onMessage);
    client.on("close", () => clearTimeout(timeout));
  }

  private async begin(client: WebSocket, start: StreamStart | null): Promise<void> {
    if (!start?.streamSid) throw new Error("Missing stream id.");
    const { call, flow, llm, speech } = await this.phone.answer(
      start.callId,
      start.token,
      this.provider,
    );
    const rules = await this.compliance.rules(call.projectId);
    const agent = await this.agents.load(call.agentId);
    const useKnowledge = agent.knowledge && (await this.knowledge.hasSources(call.projectId));
    new CallSession({
      flow,
      variables: call.variables,
      llm,
      speech,
      transport: this.transport(client, start.streamSid),
      recorder: this.calls.recorder(call.id),
      preamble: rules.disclosure,
      instantOpening: true,
      // The agent finishes its sentence; the caller is answered right after.
      bargeIn: false,
      knowledge: useKnowledge ? (question) => this.knowledge.lookup(call.projectId, question) : undefined,
      transfer: ({ to }) => this.phone.transfer(call, to),
    }).start();
  }
}

@WebSocketGateway({ path: "/ws/phone" })
export class TwilioGateway extends PhoneStreamGateway {
  protected provider = "twilio" as const;

  constructor(
    phone: PhoneService,
    calls: CallsService,
    compliance: ComplianceService,
    knowledge: KnowledgeService,
    agents: AgentsService,
  ) {
    super(phone, calls, compliance, knowledge, agents);
  }

  protected parseStart(msg: Record<string, any>): StreamStart | null {
    const params = msg.start?.customParameters ?? {};
    return {
      streamSid: msg.start?.streamSid ?? "",
      callId: params.callId ?? "",
      token: params.token ?? "",
    };
  }

  protected transport(client: WebSocket, streamSid: string): Transport {
    return new TwilioTransport(client, streamSid);
  }
}

@WebSocketGateway({ path: "/ws/exotel" })
export class ExotelGateway extends PhoneStreamGateway {
  protected provider = "exotel" as const;

  constructor(
    phone: PhoneService,
    calls: CallsService,
    compliance: ComplianceService,
    knowledge: KnowledgeService,
    agents: AgentsService,
  ) {
    super(phone, calls, compliance, knowledge, agents);
  }

  // Exotel passes the URL's query parameters back in the start message; the
  // connection URL itself is the fallback.
  protected parseStart(msg: Record<string, any>, request: IncomingMessage): StreamStart | null {
    const params = msg.start?.custom_parameters ?? {};
    const query = new URL(request.url ?? "", "http://localhost").searchParams;
    return {
      streamSid: msg.stream_sid ?? msg.start?.stream_sid ?? "",
      callId: params.callId ?? query.get("callId") ?? "",
      token: params.token ?? query.get("token") ?? "",
    };
  }

  protected transport(client: WebSocket, streamSid: string): Transport {
    return new ExotelTransport(client, streamSid);
  }
}

@WebSocketGateway({ path: STREAM_PATH })
export class VobizGateway extends PhoneStreamGateway {
  protected provider = "vobiz" as const;

  constructor(
    phone: PhoneService,
    calls: CallsService,
    compliance: ComplianceService,
    knowledge: KnowledgeService,
    agents: AgentsService,
  ) {
    super(phone, calls, compliance, knowledge, agents);
  }

  // Vobiz passes nothing of ours in its start message. The call's id and
  // token arrive in the path it connects to, which PhoneWsAdapter has moved
  // into the query by now.
  protected parseStart(msg: Record<string, any>, request: IncomingMessage): StreamStart | null {
    const query = new URL(request.url ?? "", "http://localhost").searchParams;
    return {
      streamSid: msg.start?.streamId ?? "",
      callId: query.get("callId") ?? "",
      token: query.get("token") ?? "",
    };
  }

  protected transport(client: WebSocket, streamSid: string): Transport {
    return new VobizTransport(client, streamSid);
  }
}
