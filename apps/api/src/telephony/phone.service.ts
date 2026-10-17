import type { Flow } from "@oxumi/flow-core";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { AgentsService } from "../agents/agents.service";
import { Call } from "../calls/call.entity";
import { CallsService } from "../calls/calls.service";
import { ComplianceService } from "../compliance/compliance.service";
import { SYSTEM } from "../projects/audit.service";
import { AppConfig } from "../config";
import { CredentialsService } from "../credentials/credentials.service";
import { LlmRegistry } from "../llm/registry";
import { prepareOpening } from "../runtime/conversation";
import type { LlmProvider } from "../llm/types";
import { SpeechRegistry } from "../speech/registry";
import type { SpeechProvider } from "../speech/types";
import * as exotel from "./exotel";
import * as twilio from "./twilio";
import * as vobiz from "./vobiz";

// International format: a plus sign, country code, then the number.
const E164 = /^\+[1-9]\d{7,14}$/;

export const TELEPHONY_PROVIDERS = ["twilio", "exotel", "vobiz"] as const;
const TELEPHONY_LABEL: Record<TelephonyId, string> = {
  twilio: "Twilio",
  exotel: "Exotel",
  vobiz: "Vobiz",
};
export type TelephonyId = (typeof TELEPHONY_PROVIDERS)[number];

export interface PhoneCallRequest {
  agentId?: unknown;
  to?: unknown;
  variables?: unknown;
  metadata?: unknown;
  model?: unknown;
  // Evidence the person agreed to be called, recorded before the checks:
  // { given: true, source: "website form", capturedAt: "2026-10-01T10:00:00Z" }.
  consent?: unknown;
  // "twilio", "exotel" or "vobiz"; defaults to whichever the project has
  // connected.
  provider?: unknown;
}

// Everything a live phone call needs once the person has picked up.
export interface AnsweredCall {
  call: Call;
  flow: Flow;
  llm: LlmProvider;
  speech: SpeechProvider;
}

// Final statuses, from either provider, that mean the person was never reached.
const UNREACHED: Record<string, string> = {
  busy: "The line was busy.",
  "no-answer": "Nobody answered.",
  failed: "The call could not be connected.",
  canceled: "The call was cancelled before it was answered.",
};

type Account =
  | { id: "twilio"; twilio: twilio.TwilioAccount }
  | { id: "exotel"; exotel: exotel.ExotelAccount }
  | { id: "vobiz"; vobiz: vobiz.VobizAccount };

@Injectable()
export class PhoneService {
  private logger = new Logger(PhoneService.name);

  constructor(
    private config: AppConfig,
    private agents: AgentsService,
    private calls: CallsService,
    private credentials: CredentialsService,
    private llm: LlmRegistry,
    private speech: SpeechRegistry,
    private compliance: ComplianceService,
  ) {}

  private async twilioAccount(projectId: string): Promise<twilio.TwilioAccount | null> {
    const credential = await this.credentials.resolve(projectId, "twilio");
    const accountSid = credential?.options.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
    const fromNumber = credential?.options.fromNumber ?? process.env.TWILIO_FROM_NUMBER;
    if (!credential || !accountSid || !fromNumber) return null;
    return { accountSid, authToken: credential.secret, fromNumber };
  }

  private async exotelAccount(projectId: string): Promise<exotel.ExotelAccount | null> {
    const credential = await this.credentials.resolve(projectId, "exotel");
    const { apiKey, accountSid, callerId, appId, host } = credential?.options ?? {};
    if (!credential || !apiKey || !accountSid || !callerId || !appId) return null;
    return {
      apiKey,
      accountSid,
      callerId,
      appId,
      apiToken: credential.secret,
      host: host || "api.exotel.com",
    };
  }

  private async vobizAccount(projectId: string): Promise<vobiz.VobizAccount | null> {
    const credential = await this.credentials.resolve(projectId, "vobiz");
    // The server's own account, when the project has not saved one.
    const authId = credential?.options.authId ?? process.env.VOBIZ_AUTH_ID;
    const fromNumber = credential?.options.fromNumber ?? process.env.VOBIZ_FROM_NUMBER;
    if (!credential || !authId || !fromNumber) return null;
    return { authId, fromNumber, authToken: credential.secret };
  }

  // Whether phone calls can be placed for a project right now, and if not,
  // what stands in the way.
  async readiness(projectId: string): Promise<{
    ready: boolean;
    // Connected and complete telephony providers.
    providers: TelephonyId[];
    // False when the server has no public address for providers to reach.
    serverReachable: boolean;
    // The server's public address, or "" when none is configured. Providers
    // are pointed at paths under it, e.g. /telephony/exotel/stream.
    publicUrl: string;
  }> {
    const providers: TelephonyId[] = [];
    if (await this.twilioAccount(projectId)) providers.push("twilio");
    if (await this.exotelAccount(projectId)) providers.push("exotel");
    if (await this.vobizAccount(projectId)) providers.push("vobiz");
    const serverReachable = Boolean(this.config.publicUrl);
    return {
      ready: providers.length > 0 && serverReachable,
      providers,
      serverReachable,
      publicUrl: this.config.publicUrl.replace(/\/$/, ""),
    };
  }

  // The telephony account to use: the one asked for, or the first connected.
  private async account(projectId: string, requested?: string): Promise<Account> {
    if (requested && !TELEPHONY_PROVIDERS.includes(requested as TelephonyId))
      throw new BadRequestException(`provider must be one of: ${TELEPHONY_PROVIDERS.join(", ")}.`);
    for (const id of requested ? [requested as TelephonyId] : TELEPHONY_PROVIDERS) {
      if (id === "twilio") {
        const account = await this.twilioAccount(projectId);
        if (account) return { id, twilio: account };
      } else if (id === "exotel") {
        const account = await this.exotelAccount(projectId);
        if (account) return { id, exotel: account };
      } else {
        const account = await this.vobizAccount(projectId);
        if (account) return { id, vobiz: account };
      }
    }
    throw new BadRequestException(
      requested
        ? `${TELEPHONY_LABEL[requested as TelephonyId]} is not fully connected. Complete its details under Integrations.`
        : "Phone calls need a telephony provider. Connect Twilio, Exotel or Vobiz under Integrations.",
    );
  }

  private get publicBase(): string {
    if (!this.config.publicUrl)
      throw new ServiceUnavailableException(
        "Phone calls are not available: the server has no public URL configured (PUBLIC_URL).",
      );
    return this.config.publicUrl.replace(/\/$/, "");
  }

  // Validates everything up front, records the call, and asks the provider to
  // dial. Returns as soon as the call is ringing; the result arrives by webhook.
  async start(projectId: string, ownerId: string, input: PhoneCallRequest): Promise<Call> {
    if (typeof input.agentId !== "string")
      throw new BadRequestException("agentId is required.");
    const to = typeof input.to === "string" ? input.to.replace(/[\s()-]/g, "") : "";
    if (!E164.test(to))
      throw new BadRequestException(
        'to must be a phone number in international format, e.g. "+919876543210".',
      );

    const agent = await this.agents.find(input.agentId, ownerId, "editor");
    if (agent.projectId !== projectId) throw new NotFoundException("Agent not found.");
    const { flow, issues } = this.agents.check(agent);
    const blocking = issues.find((issue) => issue.level === "error");
    if (!flow || blocking)
      throw new UnprocessableEntityException(
        `This agent's flow is not ready: ${blocking?.message}`,
      );
    const variables = stringRecord(input.variables);
    const missing = flow.variables.filter((v) => !variables[v.name]?.trim());
    if (missing.length)
      throw new BadRequestException(
        `Missing variables: ${missing.map((v) => v.name).join(", ")}`,
      );

    // The project's own rules: do-not-call list, calling hours, consent.
    if (input.consent !== undefined && input.consent !== null) {
      const consent = typeof input.consent === "object" ? (input.consent as Record<string, unknown>) : {};
      await this.compliance.recordConsent(projectId, SYSTEM, {
        ...consent,
        number: to,
        source: typeof consent.source === "string" && consent.source ? consent.source : "API",
      });
    }
    const blocks = await this.compliance.blocks(projectId, to);
    if (blocks.length)
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: "Not allowed",
        code: blocks[0]!.code,
        message: blocks.map((block) => block.message).join(" "),
        blocks,
      });

    // Fail now, not after the phone is ringing, if anything is not connected.
    const base = this.publicBase;
    // The request can name a provider; otherwise the agent's own choice
    // applies, and failing that whichever the project has connected.
    const account = await this.account(
      projectId,
      (typeof input.provider === "string" && input.provider) || agent.telephony || undefined,
    );
    // An agent can call from its own number instead of the provider default.
    if (agent.phoneNumber) {
      if (account.id === "twilio") account.twilio.fromNumber = agent.phoneNumber;
      else if (account.id === "exotel") account.exotel.callerId = agent.phoneNumber;
      else account.vobiz.fromNumber = agent.phoneNumber;
    }
    const { ref: model, llm } = await this.llm.resolve(
      projectId,
      (typeof input.model === "string" && input.model) || agent.model,
    );
    // Ready by the time the call is answered, so it opens without a pause.
    prepareOpening(flow, llm, (await this.compliance.rules(projectId)).disclosure);
    if (!(await this.speech.forProject(projectId, agent.speech || undefined)))
      throw new BadRequestException(
        "Phone calls need a speech provider. Add an ElevenLabs or Sarvam key under Integrations.",
      );

    const streamToken = randomBytes(24).toString("base64url");
    const call = await this.calls.create(agent, "phone", variables, model, {
      to,
      status: "queued",
      metadata: stringRecord(input.metadata),
      streamToken,
      telephony: account.id,
    });

    const statusUrl = `${base}/telephony/${account.id}/status?callId=${call.id}&token=${streamToken}`;
    const maxDurationSec = flow.settings.maxDurationSec;
    try {
      const providerCallId =
        account.id === "twilio"
          ? await twilio.dial(account.twilio, {
              to,
              streamUrl: `${base.replace(/^http/, "ws")}/ws/phone`,
              statusUrl,
              params: { callId: call.id, token: streamToken },
              maxDurationSec,
            })
          : account.id === "exotel"
            ? await exotel.dial(account.exotel, { to, statusUrl, maxDurationSec })
            : await vobiz.dial(account.vobiz, {
                to,
                answerUrl: `${base}/telephony/vobiz/answer?callId=${call.id}&token=${streamToken}`,
                hangupUrl: statusUrl,
                maxDurationSec,
              });
      await this.calls.patch(call.id, { providerCallId, status: "ringing" });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "The call could not be placed.";
      await this.calls.fail(call.id, reason);
      throw new BadRequestException(reason);
    }
    return this.calls.find(call.id);
  }

  // Exotel asks where to send a call's audio. The answer carries the call's
  // id and token, which Exotel hands back when it opens the stream.
  async exotelStreamUrl(providerCallId: string): Promise<{ url: string }> {
    const call = providerCallId
      ? await this.calls.findByProviderCallId(providerCallId)
      : null;
    if (!call?.streamToken || call.telephony !== "exotel" || call.status === "ended")
      throw new NotFoundException("Unknown call.");
    const base = this.publicBase.replace(/^http/, "ws");
    return { url: `${base}/ws/exotel?callId=${call.id}&token=${call.streamToken}` };
  }

  // Vobiz asks what to do with a call that has just been answered: connect
  // its audio to our socket, at an address only this call knows.
  async vobizAnswer(
    callId: string,
    token: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<string> {
    const call = await this.authorise(callId, token).catch(() => null);
    if (!call || call.telephony !== "vobiz" || call.status === "ended")
      throw new NotFoundException("Unknown call.");
    const base = this.publicBase;
    await this.checkVobizSignature(call.projectId, `${base}/telephony/vobiz/answer`, headers);
    return vobiz.answerXml(`${base.replace(/^http/, "ws")}${vobiz.streamPath(call.id, token)}`);
  }

  // Vobiz reports that a call is over, with the reason.
  async vobizEnded(
    callId: string,
    token: string,
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const call = await this.authorise(callId, token).catch(() => null);
    if (!call || call.telephony !== "vobiz") return;
    if (this.config.publicUrl)
      await this.checkVobizSignature(
        call.projectId,
        `${this.publicBase}/telephony/vobiz/status`,
        headers,
      );
    await this.statusChanged("vobiz", callId, token, vobiz.hangupStatus(body));
  }

  // Vobiz signs its callbacks only for accounts set up to, so a missing
  // signature is accepted (the per-call token has already been checked) and
  // a wrong one is not.
  private async checkVobizSignature(
    projectId: string,
    url: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const account = await this.vobizAccount(projectId);
    if (account && vobiz.signatureValid(url, account.authToken, headers) === false)
      throw new ForbiddenException("The Vobiz signature does not match.");
  }

  // Called when the provider opens the audio stream: proves the stream belongs
  // to a call we placed and gathers what the session needs.
  async answer(callId: string, token: string, provider: TelephonyId): Promise<AnsweredCall> {
    const call = await this.authorise(callId, token);
    if (call.status === "ended") throw new Error("This call has already ended.");
    if (call.telephony !== provider) throw new Error("This call belongs to another provider.");
    const agent = await this.agents.load(call.agentId);
    const { flow } = this.agents.check(agent);
    if (!flow) throw new Error("The agent's flow is no longer valid.");
    const { llm } = await this.llm.resolve(call.projectId, call.model);
    const speech = await this.speech.forProject(call.projectId, agent.speech || undefined);
    if (!speech) throw new Error("No speech provider is connected.");
    await this.calls.patch(call.id, { status: "in_progress" });
    return { call, flow, llm, speech };
  }

  // The provider reports how the call went. If the person was never reached,
  // or the call ended without a conversation, close the record accordingly.
  // Exotel's callback body is not parsed; its status is read back instead.
  async statusChanged(
    provider: TelephonyId,
    callId: string,
    token: string,
    reported: string,
  ): Promise<void> {
    const call = await this.authorise(callId, token).catch(() => null);
    if (!call || call.status === "ended" || call.telephony !== provider) return;

    let status = reported;
    if (provider === "exotel") {
      const account = await this.exotelAccount(call.projectId);
      if (!account || !call.providerCallId) return;
      status = await exotel.callStatus(account, call.providerCallId).catch((err) => {
        this.logger.warn(`Could not read Exotel call status: ${String(err)}`);
        return "";
      });
    }
    const unreached = UNREACHED[status];
    if (unreached) await this.calls.fail(call.id, unreached);
    else if (status === "completed" && call.status !== "in_progress")
      await this.calls.fail(call.id, "The call ended before the conversation started.");
  }

  // Hands a live phone call to a person. Only Twilio can redirect a call in
  // progress through its API so far; on the others the call carries on.
  async transfer(call: Call, to: string): Promise<{ ok: true; status: "connected" } | { ok: false; error: string }> {
    if (call.telephony !== "twilio" || !call.providerCallId)
      return {
        ok: false,
        error: `Transfers are not available on ${TELEPHONY_LABEL[call.telephony as TelephonyId] ?? "this provider"} yet.`,
      };
    const account = await this.twilioAccount(call.projectId);
    if (!account) return { ok: false, error: "Twilio is no longer connected." };
    const agent = await this.agents.load(call.agentId).catch(() => null);
    if (agent?.phoneNumber) account.fromNumber = agent.phoneNumber;
    const whisperUrl = `${this.publicBase}/telephony/twilio/whisper?callId=${call.id}&token=${call.streamToken}`;
    try {
      await twilio.transfer(account, call.providerCallId, { to, whisperUrl });
      return { ok: true, status: "connected" };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Twilio refused the transfer." };
    }
  }

  // The summary Twilio reads to the person a call was transferred to.
  async whisper(callId: string, token: string): Promise<string> {
    const call = await this.authorise(callId, token).catch(() => null);
    if (!call?.handoff) throw new NotFoundException("Unknown call.");
    return twilio.whisperXml(call.handoff.summary);
  }

  async cancel(projectId: string, callId: string): Promise<void> {
    const call = await this.calls.find(callId).catch(() => null);
    if (!call || call.projectId !== projectId) throw new NotFoundException("Call not found.");
    if (call.status === "ended" || !call.providerCallId) return;
    if (call.telephony === "exotel")
      throw new BadRequestException(
        "Exotel does not offer a way to end a call through its API; it ends at the flow's time limit.",
      );
    if (call.telephony === "vobiz") {
      const account = await this.vobizAccount(projectId);
      if (account) await vobiz.hangUp(account, call.providerCallId);
      return;
    }
    const account = await this.twilioAccount(projectId);
    if (account) await twilio.hangUp(account, call.providerCallId);
  }

  private async authorise(callId: string, token: string): Promise<Call> {
    const call = await this.calls.findWithToken(callId);
    const expected = Buffer.from(call?.streamToken ?? "");
    const given = Buffer.from(token ?? "");
    if (!call || !expected.length || expected.length !== given.length || !timingSafeEqual(expected, given))
      throw new Error("Unknown call.");
    return call;
  }
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .map(([k, v]) => [k, String(v)]),
  );
}
