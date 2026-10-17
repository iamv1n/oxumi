import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { ApiKeysService } from "./api-keys.service";

// Key management, for the signed-in owner of the project (session cookie).
@Controller("projects/:projectId")
export class ApiKeysController {
  constructor(private keys: ApiKeysService) {}

  @Get("api-keys")
  list(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.keys.list(projectId, user.id);
  }

  @Post("api-keys")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { name?: unknown; expiresInDays?: unknown },
  ) {
    return this.keys.create(projectId, user.id, body ?? {});
  }

  @Post("api-keys/:id/rotate")
  rotate(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { graceHours?: unknown },
  ) {
    return this.keys.rotate(projectId, user.id, id, body ?? {});
  }

  @Delete("api-keys/:id")
  @HttpCode(204)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.keys.revoke(projectId, user.id, id);
  }

  @Get("api-usage")
  usage(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("days") days?: string,
  ) {
    return this.keys.report(projectId, user.id, days);
  }
}
