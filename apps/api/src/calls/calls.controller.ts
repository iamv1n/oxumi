import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { CallsService } from "./calls.service";

@Controller()
export class CallsController {
  constructor(private calls: CallsService) {}

  @Get("projects/:projectId/calls")
  list(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("agentId") agentId?: string,
  ) {
    return this.calls.list(projectId, user.id, agentId || undefined);
  }

  @Get("calls/:id")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.calls.get(id, user.id);
  }
}
