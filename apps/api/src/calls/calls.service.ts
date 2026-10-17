import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { BillingService } from "../billing/billing.service";
import { ComplianceService } from "../compliance/compliance.service";
import { SYSTEM } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import type { CallRecorder } from "../runtime/call-session";
import { Call, type Channel } from "./call.entity";
import { Turn } from "./turn.entity";
import { WebhooksService } from "../webhooks/webhooks.service";

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call) private calls: Repository<Call>,
    @InjectRepository(Turn) private turns: Repository<Turn>,
    private projects: ProjectsService,
    private webhooks: WebhooksService,
    private compliance: ComplianceService,
    private billing: BillingService,
  ) {}

  // Every channel starts its calls here, so this is where the project's
  // monthly spending limit is enforced.
  async create(
    agent: { id: string; projectId: string },
    channel: Channel,
    variables: Record<string, string>,
    model: string,
    extra: Partial<
      Pick<Call, "to" | "status" | "metadata" | "streamToken" | "telephony">
    > = {},
  ): Promise<Call> {
    await this.billing.assertWithinLimit(agent.projectId);
    return this.calls.save(
      this.calls.create({
        agentId: agent.id,
        projectId: agent.projectId,
        channel,
        variables,
        model,
        ...extra,
      }),
    );
  }

  async patch(
    id: string,
    changes: Partial<Pick<Call, "status" | "providerCallId">>,
  ): Promise<void> {
    await this.calls.update(id, changes);
  }

  // No ownership check: for server-side use on a call already authorised.
  async find(id: string): Promise<Call> {
    const call = await this.calls.findOneBy({ id });
    if (!call) throw new NotFoundException("Call not found.");
    return call;
  }

  // Looks a call up by the telephony provider's own id for it.
  findByProviderCallId(providerCallId: string): Promise<Call | null> {
    return this.calls
      .createQueryBuilder("call")
      .addSelect("call.streamToken")
      .where('call."providerCallId" = :providerCallId', { providerCallId })
      .getOne();
  }

  findWithToken(id: string): Promise<Call | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.resolve(null);
    return this.calls
      .createQueryBuilder("call")
      .addSelect("call.streamToken")
      .where("call.id = :id", { id })
      .getOne();
  }

  // Closes a call that never became a conversation (not answered, could not
  // be placed), unless it has already ended.
  async fail(id: string, reason: string): Promise<void> {
    const closed = await this.calls.update(
      { id, status: Not("ended") },
      { status: "ended", outcome: "failed", error: reason, endedAt: new Date() },
    );
    if (closed.affected) await this.announce(id);
  }

  // Spend may have crossed the alert threshold.
  private settled(projectId: string): void {
    void this.billing.afterCall(projectId).catch(() => undefined);
  }

  recorder(callId: string): CallRecorder {
    return {
      turn: async (record) => {
        await this.turns.save(this.turns.create({ callId, ...record }));
      },
      handoff: async (record) => {
        await this.calls.update(callId, { handoff: record });
      },
      finish: async ({ outcome, fields }) => {
        const closed = await this.calls.update(
          { id: callId, status: Not("ended") },
          { outcome, fields, status: "ended", endedAt: new Date() },
        );
        if (!closed.affected) return;
        // Someone who says they do not want these calls is not called again.
        if (outcome === "opted_out") {
          const call = await this.calls.findOneBy({ id: callId });
          if (call?.channel === "phone" && call.to)
            await this.compliance.optOut(call.projectId, call.to, callId, SYSTEM);
        }
        await this.announce(callId);
        const call = await this.calls.findOneBy({ id: callId });
        if (call) this.settled(call.projectId);
      },
    };
  }

  // Tells the customer's systems a call is over. Calls started from the
  // console's Test tab are not announced; they are the owner trying things out.
  private async announce(callId: string): Promise<void> {
    const call = await this.calls.findOne({
      where: { id: callId },
      relations: { turns: true, agent: true },
      select: { agent: { id: true, name: true } },
      order: { turns: { index: "ASC" } },
    });
    if (!call || (call.channel !== "phone" && call.channel !== "api_text")) return;
    await this.webhooks.emit(call.projectId, "call.completed", { call: describeCall(call) });
  }

  // Most recent first, each with its agent's name and number of turns.
  async list(projectId: string, userId: string, agentId?: string): Promise<Call[]> {
    await this.projects.get(projectId, userId);
    const query = this.calls
      .createQueryBuilder("call")
      .leftJoin("call.agent", "agent")
      .addSelect(["agent.id", "agent.name"])
      .loadRelationCountAndMap("call.turnCount", "call.turns")
      .where("call.projectId = :projectId", { projectId })
      .orderBy("call.startedAt", "DESC")
      .take(200);
    if (agentId) query.andWhere("call.agentId = :agentId", { agentId });
    return query.getMany();
  }

  async get(id: string, userId: string): Promise<Call> {
    const call = await this.calls.findOne({
      where: { id },
      relations: { turns: true, agent: true },
      select: { agent: { id: true, name: true } },
      order: { turns: { index: "ASC" } },
    });
    if (!call) throw new NotFoundException("Call not found.");
    await this.projects.get(call.projectId, userId).catch(() => {
      throw new NotFoundException("Call not found.");
    });
    return call;
  }
}

// The shape of a finished call as sent to webhooks.
export function describeCall(call: Call): Record<string, unknown> {
  return {
    id: call.id,
    agentId: call.agentId,
    agentName: call.agent?.name ?? null,
    channel: call.channel,
    to: call.to,
    status: call.status,
    outcome: call.outcome,
    error: call.error,
    handoff: call.handoff
      ? {
          to: call.handoff.to,
          reason: call.handoff.reason,
          status: call.handoff.status,
          summary: call.handoff.summary,
          error: call.handoff.error ?? null,
        }
      : null,
    fields: call.fields,
    variables: call.variables,
    metadata: call.metadata,
    model: call.model,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    durationSeconds: call.endedAt
      ? Math.max(0, Math.round((+call.endedAt - +call.startedAt) / 1000))
      : null,
    turns: (call.turns ?? []).map((turn) => ({
      index: turn.index,
      caller: turn.callerText,
      agent: turn.agentText,
      interrupted: turn.interrupted,
      step: turn.nodeId,
    })),
  };
}
