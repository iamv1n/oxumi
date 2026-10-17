import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminGuard, CurrentUser } from "../auth/auth.guard";
import {
  ADMIN_SESSION_COOKIE,
  AuthService,
  type AuthUser,
  IMPERSONATION_TTL_MS,
  readCookie,
  SESSION_COOKIE,
} from "../auth/auth.service";
import { setAuthCookie } from "../auth/cookies";
import { AdminService } from "./admin.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private admin: AdminService,
    private auth: AuthService,
  ) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("users")
  users(@Query("q") q?: string) {
    return this.admin.users(q);
  }

  @Get("users/:id")
  user(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.user(id);
  }

  @Patch("users/:id")
  setRole(
    @CurrentUser() admin: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { role?: unknown },
  ) {
    return this.admin.setRole(admin, id, body?.role);
  }

  @Get("projects")
  projects(@Query("q") q?: string) {
    return this.admin.projects(q);
  }

  // Signs this browser in as the user. The admin's own session is parked in
  // a second cookie for POST /auth/stop-impersonating to put back.
  @Post("users/:id/impersonate")
  async impersonate(
    @CurrentUser() admin: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.impersonate(admin, id);
    const adminToken = readCookie(req.headers.cookie, SESSION_COOKIE)!;
    setAuthCookie(res, ADMIN_SESSION_COOKIE, adminToken);
    setAuthCookie(res, SESSION_COOKIE, token, IMPERSONATION_TTL_MS);
    return { user: await this.auth.userForToken(token) };
  }
}
