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
  Query,
} from "@nestjs/common";
import { CurrentUser, Public } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { AuditService } from "./audit.service";
import { MembersService } from "./members.service";
import { ProjectsService } from "./projects.service";

@Controller("projects/:projectId")
export class TeamController {
  constructor(
    private members: MembersService,
    private projects: ProjectsService,
    private audit: AuditService,
  ) {}

  @Get("members")
  list(@CurrentUser() user: AuthUser, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.members.list(projectId, user.id);
  }

  @Patch("members/:userId")
  setRole(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() body: { role?: unknown },
  ) {
    return this.members.setRole(projectId, user, userId, body?.role);
  }

  @Delete("members/:userId")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.members.remove(projectId, user, userId);
  }

  @Get("invites")
  invites(@CurrentUser() user: AuthUser, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.members.pending(projectId, user.id);
  }

  @Post("invites")
  invite(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { email?: unknown; role?: unknown },
  ) {
    return this.members.invite(projectId, user, body ?? {});
  }

  @Delete("invites/:inviteId")
  @HttpCode(204)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("inviteId", ParseUUIDPipe) inviteId: string,
  ) {
    return this.members.revokeInvite(projectId, user, inviteId);
  }

  // Every member can read the log; it is how a team sees who changed what.
  @Get("audit")
  async log(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("before") before?: string,
  ) {
    await this.projects.get(projectId, user.id);
    return this.audit.list(projectId, before);
  }
}

// Opening an invitation link: what it is for (before signing in), then
// accepting it as the signed-in user.
@Controller("invites")
export class InvitesController {
  constructor(private members: MembersService) {}

  @Public()
  @Get(":token")
  preview(@Param("token") token: string) {
    return this.members.preview(token);
  }

  @Post(":token/accept")
  accept(@CurrentUser() user: AuthUser, @Param("token") token: string) {
    return this.members.accept(token, user);
  }
}
