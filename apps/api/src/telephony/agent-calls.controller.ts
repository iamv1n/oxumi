import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { AgentsService } from "../agents/agents.service";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { PhoneService, type PhoneCallRequest } from "./phone.service";

// Lets the signed-in owner place a phone call from the app, the same way the
// public API does for their software.
@Controller("agents")
export class AgentCallsController {
  constructor(
    private agents: AgentsService,
    private phone: PhoneService,
  ) {}

  @Post(":id/phone-calls")
  @HttpCode(202)
  async call(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: Omit<PhoneCallRequest, "agentId">,
  ) {
    const agent = await this.agents.find(id, user.id, "editor");
    return this.phone.start(agent.projectId, user.id, { ...(body ?? {}), agentId: id });
  }
}
