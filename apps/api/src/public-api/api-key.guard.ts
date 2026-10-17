import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { type AuthenticatedKey, ApiKeysService } from "./api-keys.service";

type KeyedRequest = Request & { apiKey?: AuthenticatedKey };

export const CurrentKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedKey =>
    context.switchToHttp().getRequest<KeyedRequest>().apiKey!,
);

export const RATE_LIMIT_PER_MINUTE = 120;
const WINDOW_MS = 60_000;

// Guards the public API: authenticates the bearer key, applies a per-key
// rate limit, and records every request for the usage report.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  // Per-key counters for the current minute. In memory, so the limit is per
  // server instance; move to Redis before running more than one.
  private windows = new Map<string, { start: number; count: number }>();

  constructor(private keys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<KeyedRequest>();
    const response = http.getResponse<Response>();
    const started = Date.now();

    const header = request.headers.authorization ?? "";
    const secret = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const key = secret ? await this.keys.authenticate(secret) : null;
    if (!key) {
      throw new UnauthorizedException(
        "Missing or invalid API key. Send it as: Authorization: Bearer <key>",
      );
    }
    request.apiKey = key;

    response.on("finish", () =>
      this.keys.record({
        key,
        method: request.method,
        route: (request.route as { path?: string } | undefined)?.path ?? request.path,
        status: response.statusCode,
        durationMs: Date.now() - started,
      }),
    );

    const now = Date.now();
    let window = this.windows.get(key.id);
    if (!window || now - window.start >= WINDOW_MS) {
      window = { start: now, count: 0 };
      this.windows.set(key.id, window);
    }
    window.count++;
    const resetSeconds = Math.ceil((window.start + WINDOW_MS - now) / 1000);
    response.setHeader("X-RateLimit-Limit", RATE_LIMIT_PER_MINUTE);
    response.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, RATE_LIMIT_PER_MINUTE - window.count),
    );
    response.setHeader("X-RateLimit-Reset", resetSeconds);
    if (window.count > RATE_LIMIT_PER_MINUTE) {
      response.setHeader("Retry-After", resetSeconds);
      throw new HttpException(
        `Rate limit of ${RATE_LIMIT_PER_MINUTE} requests per minute exceeded.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
