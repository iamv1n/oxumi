import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "node:crypto";
import { DataSource, Repository } from "typeorm";
import { AuditService } from "../projects/audit.service";
import { ProjectsService, requireName } from "../projects/projects.service";
import { ApiKey } from "./api-key.entity";
import { ApiUsage } from "./api-usage.entity";

export type ApiKeyStatus = "active" | "expiring" | "expired" | "revoked";

export interface ApiKeyView {
  id: string;
  name: string;
  // e.g. "ox_live_3fK9a2Qx…": enough to tell keys apart, useless as a secret.
  prefix: string;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  rotatedToId: string | null;
}

// Returned once, when a key is created or rotated.
export interface NewApiKey extends ApiKeyView {
  secret: string;
}

export interface AuthenticatedKey {
  id: string;
  projectId: string;
  // The project's owner, used to authorise through the same services as the app.
  ownerId: string;
}

export interface UsageReport {
  days: number;
  requests: number;
  errors: number;
  byDay: { date: string; requests: number; errors: number }[];
  byKey: { apiKeyId: string; name: string; prefix: string; requests: number }[];
  byRoute: { method: string; route: string; requests: number; errors: number; medianMs: number }[];
}

const KEY_PREFIX = "ox_live_";
const SHOWN_CHARS = KEY_PREFIX.length + 8;
const MAX_GRACE_HOURS = 168;
const MAX_ACTIVE_KEYS = 20;

const hashKey = (secret: string) => createHash("sha256").update(secret).digest("hex");

function statusOf(key: ApiKey, now = Date.now()): ApiKeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && +key.expiresAt <= now) return "expired";
  // Rotated keys are on borrowed time.
  return key.rotatedToId ? "expiring" : "active";
}

function view(key: ApiKey): ApiKeyView {
  return {
    id: key.id,
    name: key.name,
    prefix: `${key.prefix}…`,
    status: statusOf(key),
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    revokedAt: key.revokedAt,
    rotatedToId: key.rotatedToId,
  };
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private keys: Repository<ApiKey>,
    @InjectRepository(ApiUsage) private usage: Repository<ApiUsage>,
    @InjectDataSource() private db: DataSource,
    private projects: ProjectsService,
    private audit: AuditService,
  ) {}

  private async issue(
    projectId: string,
    name: string,
    expiresAt: Date | null,
  ): Promise<NewApiKey> {
    const secret = KEY_PREFIX + randomBytes(32).toString("base64url");
    const key = await this.keys.save(
      this.keys.create({
        projectId,
        name,
        prefix: secret.slice(0, SHOWN_CHARS),
        keyHash: hashKey(secret),
        expiresAt,
        lastUsedAt: null,
        revokedAt: null,
        rotatedToId: null,
      }),
    );
    return { ...view(key), secret };
  }

  private async owned(projectId: string, userId: string, id: string): Promise<ApiKey> {
    await this.projects.get(projectId, userId, "admin");
    const key = await this.keys.findOneBy({ id, projectId });
    if (!key) throw new NotFoundException("API key not found.");
    return key;
  }

  async list(projectId: string, userId: string): Promise<ApiKeyView[]> {
    await this.projects.get(projectId, userId);
    const keys = await this.keys.find({
      where: { projectId },
      order: { createdAt: "DESC" },
    });
    return keys.map(view);
  }

  async create(
    projectId: string,
    userId: string,
    input: { name?: unknown; expiresInDays?: unknown },
  ): Promise<NewApiKey> {
    await this.projects.get(projectId, userId, "admin");
    const active = (await this.keys.findBy({ projectId })).filter(
      (key) => statusOf(key) === "active" || statusOf(key) === "expiring",
    );
    if (active.length >= MAX_ACTIVE_KEYS)
      throw new BadRequestException(
        `A project can have at most ${MAX_ACTIVE_KEYS} working keys. Revoke one first.`,
      );

    let expiresAt: Date | null = null;
    if (input.expiresInDays !== undefined && input.expiresInDays !== null) {
      const days = Number(input.expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650)
        throw new BadRequestException("expiresInDays must be a whole number from 1 to 3650.");
      expiresAt = new Date(Date.now() + days * 86_400_000);
    }
    const key = await this.issue(projectId, requireName(input.name), expiresAt);
    await this.audit.recordBy(projectId, userId, "api_key.created", `${key.name} (${key.prefix})`, {
      expiresAt,
    });
    return key;
  }

  // Issues a replacement and lets the old key keep working for a grace
  // period, so a live integration can be switched over without downtime.
  async rotate(
    projectId: string,
    userId: string,
    id: string,
    input: { graceHours?: unknown },
  ): Promise<NewApiKey> {
    const old = await this.owned(projectId, userId, id);
    if (statusOf(old) !== "active")
      throw new BadRequestException("Only an active key can be rotated.");
    const grace = input.graceHours === undefined ? 24 : Number(input.graceHours);
    if (!Number.isFinite(grace) || grace < 0 || grace > MAX_GRACE_HOURS)
      throw new BadRequestException(`graceHours must be from 0 to ${MAX_GRACE_HOURS}.`);

    const replacement = await this.issue(projectId, old.name, null);
    const cutoff = new Date(Date.now() + grace * 3_600_000);
    await this.keys.update(old.id, {
      rotatedToId: replacement.id,
      // Never extend a key that was already due to expire sooner.
      expiresAt: old.expiresAt && old.expiresAt < cutoff ? old.expiresAt : cutoff,
    });
    await this.audit.recordBy(projectId, userId, "api_key.rotated", `${old.name} (${old.prefix})`, {
      graceHours: grace,
      replacement: replacement.prefix,
    });
    return replacement;
  }

  async revoke(projectId: string, userId: string, id: string): Promise<void> {
    const key = await this.owned(projectId, userId, id);
    if (key.revokedAt) return;
    await this.keys.update(key.id, { revokedAt: new Date() });
    await this.audit.recordBy(projectId, userId, "api_key.revoked", `${key.name} (${key.prefix})`);
  }

  // Resolves a presented secret to a working key, or null.
  async authenticate(secret: string): Promise<AuthenticatedKey | null> {
    if (!secret.startsWith(KEY_PREFIX)) return null;
    const key = await this.keys.findOne({
      where: { keyHash: hashKey(secret) },
      relations: { project: true },
    });
    if (!key || !key.project.ownerId) return null;
    const status = statusOf(key);
    if (status === "revoked" || status === "expired") return null;
    return { id: key.id, projectId: key.projectId, ownerId: key.project.ownerId };
  }

  record(entry: {
    key: AuthenticatedKey;
    method: string;
    route: string;
    status: number;
    durationMs: number;
  }): void {
    const { key, ...rest } = entry;
    // Fire and forget: usage accounting must never slow or fail a request.
    void this.usage
      .insert({ projectId: key.projectId, apiKeyId: key.id, ...rest })
      .catch(() => undefined);
    void this.keys.update(key.id, { lastUsedAt: new Date() }).catch(() => undefined);
  }

  async report(projectId: string, userId: string, rawDays: unknown): Promise<UsageReport> {
    await this.projects.get(projectId, userId);
    const days = Math.min(90, Math.max(1, Number(rawDays) || 30));
    const since = new Date(Date.now() - days * 86_400_000);
    const args = [projectId, since];

    const byDay: UsageReport["byDay"] = await this.db.query(
      `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
              count(*)::int AS requests,
              count(*) FILTER (WHERE status >= 400)::int AS errors
         FROM api_usage WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY 1 ORDER BY 1`,
      args,
    );
    const byKey: UsageReport["byKey"] = await this.db.query(
      `SELECT k.id AS "apiKeyId", k.name, k.prefix || '…' AS prefix, count(u.id)::int AS requests
         FROM api_keys k
         LEFT JOIN api_usage u ON u."apiKeyId" = k.id AND u."createdAt" >= $2
        WHERE k."projectId" = $1
        GROUP BY k.id ORDER BY requests DESC, k."createdAt" DESC`,
      args,
    );
    const byRoute: UsageReport["byRoute"] = await this.db.query(
      `SELECT method, route, count(*)::int AS requests,
              count(*) FILTER (WHERE status >= 400)::int AS errors,
              round(percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs"))::int AS "medianMs"
         FROM api_usage WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY method, route ORDER BY requests DESC`,
      args,
    );
    return {
      days,
      requests: byDay.reduce((sum, d) => sum + d.requests, 0),
      errors: byDay.reduce((sum, d) => sum + d.errors, 0),
      byDay,
      byKey,
      byRoute,
    };
  }
}
