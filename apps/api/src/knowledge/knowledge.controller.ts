import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { actorOf } from "../projects/audit.service";
import { KnowledgeService } from "./knowledge.service";

@Controller("projects/:projectId/knowledge")
export class KnowledgeController {
  constructor(private knowledge: KnowledgeService) {}

  private actor(user: AuthUser) {
    return { ...actorOf(user), id: user.id };
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.knowledge.list(projectId, user.id);
  }

  // Pasted text: { title, text }. A web page: { url, title? }.
  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { title?: unknown; text?: unknown; url?: unknown },
  ) {
    return this.knowledge.add(projectId, this.actor(user), body ?? {});
  }

  @Post("search")
  @HttpCode(200)
  search(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { question?: unknown },
  ) {
    return this.knowledge.search(projectId, user.id, body?.question);
  }

  @Post(":sourceId/refresh")
  @HttpCode(200)
  refresh(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("sourceId", ParseUUIDPipe) sourceId: string,
  ) {
    return this.knowledge.refresh(projectId, this.actor(user), sourceId);
  }

  @Delete(":sourceId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("sourceId", ParseUUIDPipe) sourceId: string,
  ) {
    return this.knowledge.remove(projectId, this.actor(user), sourceId);
  }
}
