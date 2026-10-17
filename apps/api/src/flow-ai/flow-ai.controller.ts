import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { FlowAiService } from "./flow-ai.service";

@Controller("projects/:projectId/flow-ai")
export class FlowAiController {
  constructor(private flowAi: FlowAiService) {}

  // Body: { prompt, agentId? (edit that agent's flow), flow? (refine a
  // proposal instead), name?, model? }.
  // Returns a proposal; nothing is saved.
  @Post("generate")
  @HttpCode(200)
  generate(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.flowAi.generate(projectId, user.id, body ?? {});
  }
}
