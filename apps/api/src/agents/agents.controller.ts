import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { AgentsService } from "./agents.service";

@Controller()
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get("projects/:projectId/agents")
  list(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.agents.list(projectId, user.id);
  }

  @Post("projects/:projectId/agents")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.agents.create(projectId, user.id, body);
  }

  @Get("agents/:id")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.agents.get(id, user.id);
  }

  @Patch("agents/:id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.agents.update(id, user.id, body);
  }

  @Delete("agents/:id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.agents.remove(id, user.id);
  }
}
