import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  AuthService,
  type AuthUser,
  readCookie,
  SESSION_COOKIE,
} from "./auth.service";

const IS_PUBLIC = "isPublic";
// Marks a route that does not need a signed-in user.
export const Public = () => SetMetadata(IS_PUBLIC, true);

type AuthedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthedRequest>().user!,
);

// For the operator console: an admin signed in as themselves. Runs after
// AuthGuard, which has put the user on the request.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (user?.role === "admin" && !user.impersonator) return true;
    throw new ForbiddenException("Only admins can do this.");
  }
}

// Applied to every HTTP route: signed in, or explicitly @Public.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // The call socket authenticates itself when the connection opens.
    if (context.getType() !== "http") return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = await this.auth.userForToken(
      readCookie(request.headers.cookie, SESSION_COOKIE),
    );
    request.user = user ?? undefined;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || user) return true;
    throw new UnauthorizedException("Sign in to continue.");
  }
}
