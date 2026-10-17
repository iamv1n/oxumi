import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "./auth.guard";
import {
  ADMIN_SESSION_COOKIE,
  AuthService,
  type AuthUser,
  readCookie,
  BROWSER_TTL_MS,
  REMEMBER_TTL_MS,
  SESSION_COOKIE,
} from "./auth.service";
import { clearAuthCookie, setAuthCookie } from "./cookies";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  private async startSession(
    res: Response,
    user: AuthUser,
    remember: boolean,
  ): Promise<{ user: AuthUser }> {
    const ttl = remember ? REMEMBER_TTL_MS : BROWSER_TTL_MS;
    const token = await this.auth.createSession(user.id, ttl);
    setAuthCookie(res, SESSION_COOKIE, token, remember ? ttl : undefined);
    // A fresh sign-in replaces any impersonation left in this browser.
    clearAuthCookie(res, ADMIN_SESSION_COOKIE);
    return { user };
  }

  @Post("signup")
  async signup(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.startSession(res, await this.auth.signup(body ?? {}), true);
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: { email?: unknown; password?: unknown; remember?: unknown },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(body ?? {}, req.ip ?? "unknown");
    return this.startSession(res, user, body?.remember !== false);
  }

  @Post("forgot-password")
  @HttpCode(204)
  async forgotPassword(@Body() body: { email?: unknown }) {
    await this.auth.requestPasswordReset(body?.email);
  }

  @Post("reset-password")
  @HttpCode(204)
  async resetPassword(@Body() body: { token?: unknown; password?: unknown }) {
    await this.auth.resetPassword(body ?? {});
  }

  // Ends this browser's session, and the admin's own one waiting behind an
  // impersonation, if any.
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.endSession(readCookie(req.headers.cookie, SESSION_COOKIE));
    await this.auth.endSession(readCookie(req.headers.cookie, ADMIN_SESSION_COOKIE));
    clearAuthCookie(res, SESSION_COOKIE);
    clearAuthCookie(res, ADMIN_SESSION_COOKIE);
  }

  // Leaves an impersonation and puts the admin's own session back.
  @Post("stop-impersonating")
  async stopImpersonating(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const adminToken = readCookie(req.headers.cookie, ADMIN_SESSION_COOKIE);
    const admin = await this.auth.sessionForToken(adminToken);
    clearAuthCookie(res, ADMIN_SESSION_COOKIE);
    if (!admin || !adminToken || admin.user.role !== "admin" || admin.user.impersonator)
      throw new UnauthorizedException("Your admin session has ended. Sign in again.");

    const current = readCookie(req.headers.cookie, SESSION_COOKIE);
    const acting = await this.auth.userForToken(current);
    if (acting?.impersonator?.id === admin.user.id) await this.auth.endSession(current);

    setAuthCookie(
      res,
      SESSION_COOKIE,
      adminToken,
      Math.max(0, admin.expiresAt.getTime() - Date.now()),
    );
    return { user: admin.user, impersonated: acting?.impersonator ? acting.id : null };
  }

  // This controller is public as a whole, so the account routes below check
  // the session themselves. Sign-in details stay out of reach of an admin
  // acting as the user.
  private async requireUser(
    req: Request,
    { owner = false } = {},
  ): Promise<{ user: AuthUser; token: string }> {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const user = await this.auth.userForToken(token);
    if (!user || !token) throw new UnauthorizedException("Sign in to continue.");
    if (owner && user.impersonator)
      throw new ForbiddenException(
        "You're signed in as this user by an admin; only they can change this.",
      );
    return { user, token };
  }

  @Patch("me")
  async updateProfile(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const { user } = await this.requireUser(req);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (email !== null && email !== user.email) await this.requireUser(req, { owner: true });
    return { user: await this.auth.updateProfile(user.id, body ?? {}) };
  }

  @Post("change-password")
  @HttpCode(204)
  async changePassword(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const { user, token } = await this.requireUser(req, { owner: true });
    await this.auth.changePassword(user.id, body ?? {}, token);
  }

  @Delete("me")
  @HttpCode(204)
  async deleteAccount(
    @Req() req: Request,
    @Body() body: { password?: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user } = await this.requireUser(req, { owner: true });
    await this.auth.deleteAccount(user.id, body?.password);
    clearAuthCookie(res, SESSION_COOKIE);
  }

  // Answers 200 with a null user when signed out, so the web app can ask
  // "who am I?" on any page without that showing up as a failed request.
  @Get("me")
  async me(@Req() req: Request) {
    return {
      user: await this.auth.userForToken(
        readCookie(req.headers.cookie, SESSION_COOKIE),
      ),
    };
  }
}
