import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AgentsService } from "../agents/agents.service";
import { Public } from "../auth/auth.guard";
import { CallsService } from "../calls/calls.service";
import { PhoneService, type PhoneCallRequest } from "../telephony/phone.service";
import { ApiCallsService } from "./api-calls.service";
import { ApiKeyGuard, CurrentKey } from "./api-key.guard";
import type { AuthenticatedKey } from "./api-keys.service";

// The public API, version 1. Authenticated with a project API key
// (Authorization: Bearer ox_live_…); everything is scoped to that project.
@Public()
@UseGuards(ApiKeyGuard)
@Controller("v1")
export class V1Controller {
  constructor(
    private agents: AgentsService,
    private calls: CallsService,
    private apiCalls: ApiCallsService,
    private phone: PhoneService,
  ) {}

  @Get("agents")
  listAgents(@CurrentKey() key: AuthenticatedKey) {
    return this.agents.list(key.projectId, key.ownerId);
  }

  @Get("agents/:id")
  async getAgent(
    @CurrentKey() key: AuthenticatedKey,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const agent = await this.agents.get(id, key.ownerId);
    if (agent.projectId !== key.projectId) throw new NotFoundException("Agent not found.");
    // The canvas layout is an editor concern, not part of the API.
    const { layout: _layout, ...rest } = agent;
    return rest;
  }

  @Get("calls")
  async listCalls(
    @CurrentKey() key: AuthenticatedKey,
    @Query("agentId") agentId?: string,
    @Query("limit") limit?: string,
  ) {
    const calls = await this.calls.list(key.projectId, key.ownerId, agentId || undefined);
    const max = Math.min(200, Math.max(1, Number(limit) || 50));
    return calls.slice(0, max);
  }

  @Get("calls/:id")
  async getCall(
    @CurrentKey() key: AuthenticatedKey,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const call = await this.calls.get(id, key.ownerId);
    if (call.projectId !== key.projectId) throw new NotFoundException("Call not found.");
    return call;
  }

  // Places a phone call. Returns as soon as it is ringing; the result is
  // sent to the project's webhooks when the call ends.
  @Post("calls")
  @HttpCode(202)
  startCall(@CurrentKey() key: AuthenticatedKey, @Body() body: PhoneCallRequest) {
    return this.phone.start(key.projectId, key.ownerId, body ?? {});
  }

  // Hangs up a call that is still ringing or in progress.
  @Delete("calls/:id")
  @HttpCode(204)
  cancelCall(
    @CurrentKey() key: AuthenticatedKey,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.phone.cancel(key.projectId, id);
  }

  // Text conversations, for chat surfaces: your system relays what a person
  // typed and gets the agent's next line back. Same flow, same result.
  @Post("conversations")
  startConversation(
    @CurrentKey() key: AuthenticatedKey,
    @Body() body: { agentId?: unknown; variables?: unknown; model?: unknown },
  ) {
    return this.apiCalls.start(key, body ?? {});
  }

  @Post("conversations/:id/messages")
  @HttpCode(200)
  sendMessage(
    @CurrentKey() key: AuthenticatedKey,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { text?: unknown },
  ) {
    return this.apiCalls.message(key, id, body ?? {});
  }

  @Delete("conversations/:id")
  @HttpCode(204)
  endConversation(
    @CurrentKey() key: AuthenticatedKey,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.apiCalls.end(key, id);
  }
}
