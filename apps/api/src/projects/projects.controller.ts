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
import { actorOf } from "./audit.service";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: unknown; description?: unknown },
  ) {
    return this.projects.create(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.projects.get(id, user.id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { name?: unknown; description?: unknown },
  ) {
    return this.projects.update(id, { ...actorOf(user), id: user.id }, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.projects.remove(id, user.id);
  }

  @Get(":id/stats")
  stats(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.projects.stats(id, user.id);
  }
}
