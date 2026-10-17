import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { actorOf } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { ComplianceService } from "./compliance.service";

@Controller("projects/:projectId")
export class ComplianceController {
  constructor(
    private compliance: ComplianceService,
    private projects: ProjectsService,
  ) {}

  private actor(user: AuthUser) {
    return { ...actorOf(user), id: user.id };
  }

  @Get("compliance")
  read(@CurrentUser() user: AuthUser, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.compliance.read(projectId, user.id);
  }

  @Put("compliance")
  update(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compliance.update(projectId, this.actor(user), body ?? {});
  }

  // Whether a phone call to a number would be allowed right now, and if not, why.
  @Post("compliance/check")
  @HttpCode(200)
  check(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { number?: unknown },
  ) {
    return this.compliance.check(projectId, user.id, body?.number);
  }

  @Get("do-not-call")
  listDnc(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("search") search?: string,
  ) {
    return this.compliance.listDnc(projectId, user.id, search);
  }

  @Post("do-not-call")
  addDnc(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { numbers?: unknown; note?: unknown },
  ) {
    return this.compliance.addDnc(projectId, this.actor(user), body ?? {});
  }

  @Delete("do-not-call/:number")
  @HttpCode(204)
  removeDnc(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("number") number: string,
  ) {
    return this.compliance.removeDnc(projectId, this.actor(user), number);
  }

  @Get("consents")
  listConsent(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("number") number?: string,
  ) {
    return this.compliance.listConsent(projectId, user.id, number);
  }

  @Post("consents")
  async recordConsent(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.get(projectId, user.id, "editor");
    return this.compliance.recordConsent(projectId, actorOf(user), {
      ...(body ?? {}),
      source: typeof body?.source === "string" && body.source ? body.source : "console",
    });
  }
}
