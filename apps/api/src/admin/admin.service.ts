import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import type { AuthUser } from "../auth/auth.service";
import { User, type UserRole } from "../auth/user.entity";

// Read-only views across every account, for the operator console. Counts
// are attributed to a project's owner; membership in someone else's project
// is listed but not counted.

const LIST_LIMIT = 500;
const DAYS = 30;

// A search box value as an ILIKE pattern, with its wildcards taken literally.
const pattern = (q: unknown) =>
  typeof q === "string" && q.trim()
    ? `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    : null;

// Totals per owner, computed once and joined to users or projects.
const PER_PROJECT = `
  SELECT p.id AS "projectId",
         (SELECT count(*)::int FROM agents a WHERE a."projectId" = p.id) AS "agentCount",
         (SELECT count(*)::int FROM calls c WHERE c."projectId" = p.id) AS "callCount",
         (SELECT max(c."startedAt") FROM calls c WHERE c."projectId" = p.id) AS "lastCallAt",
         (SELECT count(*)::int FROM api_usage x
           WHERE x."projectId" = p.id AND x."createdAt" > now() - interval '${DAYS} days') AS "apiRequests30d"
    FROM projects p`;

@Injectable()
export class AdminService {
  private logger = new Logger(AdminService.name);

  constructor(
    @InjectDataSource() private db: DataSource,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async overview() {
    const [totals] = await this.db.query(`
      SELECT (SELECT count(*)::int FROM users) AS users,
             (SELECT count(*)::int FROM users WHERE role = 'admin') AS admins,
             (SELECT count(*)::int FROM users WHERE "createdAt" > now() - interval '${DAYS} days') AS "newUsers30d",
             (SELECT count(DISTINCT "userId")::int FROM sessions
               WHERE "expiresAt" > now() AND "impersonatorId" IS NULL) AS "signedIn",
             (SELECT count(*)::int FROM projects) AS projects,
             (SELECT count(*)::int FROM agents) AS agents,
             (SELECT count(*)::int FROM calls) AS calls,
             (SELECT count(*)::int FROM calls WHERE "startedAt" > now() - interval '${DAYS} days') AS "calls30d",
             (SELECT count(*)::int FROM api_usage WHERE "createdAt" > now() - interval '${DAYS} days') AS "apiRequests30d"`);
    const byDay: { date: string; signups: number; calls: number; apiRequests: number }[] =
      await this.db.query(`
        SELECT to_char(d, 'YYYY-MM-DD') AS date,
               (SELECT count(*)::int FROM users u WHERE date_trunc('day', u."createdAt" AT TIME ZONE 'UTC') = d) AS signups,
               (SELECT count(*)::int FROM calls c WHERE date_trunc('day', c."startedAt" AT TIME ZONE 'UTC') = d) AS calls,
               (SELECT count(*)::int FROM api_usage x WHERE date_trunc('day', x."createdAt" AT TIME ZONE 'UTC') = d) AS "apiRequests"
          FROM generate_series(
                 date_trunc('day', now() AT TIME ZONE 'UTC') - interval '${DAYS - 1} days',
                 date_trunc('day', now() AT TIME ZONE 'UTC'),
                 interval '1 day') AS d
         ORDER BY d`);
    return { ...totals, byDay };
  }

  users(q?: unknown) {
    const like = pattern(q);
    return this.db.query(
      `WITH per AS (${PER_PROJECT})
       SELECT u.id, u.email, u.name, u.company, u.role, u."createdAt", u."lastLoginAt",
              count(p.id)::int AS "projectCount",
              coalesce(sum(per."agentCount"), 0)::int AS "agentCount",
              coalesce(sum(per."callCount"), 0)::int AS "callCount",
              coalesce(sum(per."apiRequests30d"), 0)::int AS "apiRequests30d",
              max(per."lastCallAt") AS "lastCallAt"
         FROM users u
         LEFT JOIN projects p ON p."ownerId" = u.id
         LEFT JOIN per ON per."projectId" = p.id
        WHERE $1::text IS NULL OR u.email ILIKE $1 OR u.name ILIKE $1 OR u.company ILIKE $1
        GROUP BY u.id
        ORDER BY u."createdAt" DESC
        LIMIT ${LIST_LIMIT}`,
      [like],
    );
  }

  projects(q?: unknown) {
    const like = pattern(q);
    return this.db.query(
      `WITH per AS (${PER_PROJECT})
       SELECT p.id, p.name, p.description, p."createdAt",
              json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS owner,
              per."agentCount", per."callCount", per."apiRequests30d", per."lastCallAt"
         FROM projects p
         JOIN per ON per."projectId" = p.id
         LEFT JOIN users u ON u.id = p."ownerId"
        WHERE $1::text IS NULL OR p.name ILIKE $1 OR u.email ILIKE $1 OR u.name ILIKE $1
        ORDER BY p."createdAt" DESC
        LIMIT ${LIST_LIMIT}`,
      [like],
    );
  }

  async user(id: string) {
    const [user] = await this.db.query(
      `SELECT id, email, name, company, role, "createdAt", "lastLoginAt", "acceptedTermsAt"
         FROM users WHERE id = $1`,
      [id],
    );
    if (!user) throw new NotFoundException("User not found.");

    const projects = await this.db.query(
      `WITH per AS (${PER_PROJECT})
       SELECT p.id, p.name, p.description, p."createdAt",
              per."agentCount", per."callCount", per."apiRequests30d", per."lastCallAt"
         FROM projects p JOIN per ON per."projectId" = p.id
        WHERE p."ownerId" = $1
        ORDER BY p."createdAt" DESC`,
      [id],
    );
    const memberships = await this.memberships(id);

    const owned = `SELECT id FROM projects WHERE "ownerId" = $1`;
    const [calls] = await this.db.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE "startedAt" > now() - interval '${DAYS} days')::int AS "last30d",
              coalesce(round(sum(extract(epoch FROM "endedAt" - "startedAt"))
                FILTER (WHERE channel = 'phone' AND "endedAt" IS NOT NULL) / 60.0, 1), 0)::float AS "phoneMinutes",
              coalesce(round(sum(extract(epoch FROM "endedAt" - "startedAt"))
                FILTER (WHERE channel = 'browser_voice' AND "endedAt" IS NOT NULL) / 60.0, 1), 0)::float AS "browserVoiceMinutes",
              (SELECT count(*)::int FROM turns t JOIN calls c2 ON c2.id = t."callId"
                WHERE c2."projectId" IN (${owned})) AS turns
         FROM calls WHERE "projectId" IN (${owned})`,
      [id],
    );
    const byChannel = await this.countBy("channel", "calls", owned, id);
    const byOutcome = await this.countBy("coalesce(outcome, 'in_progress')", "calls", owned, id);
    const [api] = await this.db.query(
      `SELECT count(*)::int AS requests,
              count(*) FILTER (WHERE status >= 400)::int AS errors
         FROM api_usage
        WHERE "projectId" IN (${owned}) AND "createdAt" > now() - interval '${DAYS} days'`,
      [id],
    );
    const [keys] = await this.db.query(
      `SELECT count(*) FILTER (WHERE "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > now()))::int AS active
         FROM api_keys WHERE "projectId" IN (${owned})`,
      [id],
    );
    const byDay = await this.db.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              (SELECT count(*)::int FROM calls c
                WHERE c."projectId" IN (${owned})
                  AND date_trunc('day', c."startedAt" AT TIME ZONE 'UTC') = d) AS calls,
              (SELECT count(*)::int FROM api_usage x
                WHERE x."projectId" IN (${owned})
                  AND date_trunc('day', x."createdAt" AT TIME ZONE 'UTC') = d) AS "apiRequests"
         FROM generate_series(
                date_trunc('day', now() AT TIME ZONE 'UTC') - interval '${DAYS - 1} days',
                date_trunc('day', now() AT TIME ZONE 'UTC'),
                interval '1 day') AS d
        ORDER BY d`,
      [id],
    );
    const recentCalls = await this.db.query(
      `SELECT c.id, c."projectId", p.name AS "projectName", a.name AS "agentName",
              c.channel, c.outcome, c.status, c."startedAt", c."endedAt", c.to
         FROM calls c
         JOIN projects p ON p.id = c."projectId"
         LEFT JOIN agents a ON a.id = c."agentId"
        WHERE p."ownerId" = $1
        ORDER BY c."startedAt" DESC
        LIMIT 20`,
      [id],
    );
    const sessions = await this.db.query(
      `SELECT s.id, s."createdAt", s."expiresAt",
              CASE WHEN i.id IS NULL THEN NULL
                   ELSE json_build_object('id', i.id, 'name', i.name, 'email', i.email) END AS impersonator
         FROM sessions s LEFT JOIN users i ON i.id = s."impersonatorId"
        WHERE s."userId" = $1 AND s."expiresAt" > now()
        ORDER BY s."createdAt" DESC`,
      [id],
    );

    return {
      user,
      projects,
      memberships,
      sessions,
      recentCalls,
      usage: {
        calls: calls.total,
        calls30d: calls.last30d,
        phoneMinutes: calls.phoneMinutes,
        browserVoiceMinutes: calls.browserVoiceMinutes,
        turns: calls.turns,
        apiRequests30d: api.requests,
        apiErrors30d: api.errors,
        activeApiKeys: keys.active,
        byChannel,
        byOutcome,
        byDay,
      },
    };
  }

  async setRole(admin: AuthUser, id: string, role: unknown): Promise<{ id: string; role: UserRole }> {
    if (role !== "admin" && role !== "user")
      throw new BadRequestException('Role must be "admin" or "user".');
    if (id === admin.id)
      throw new BadRequestException("You can't change your own role. Ask another admin.");
    const { affected } = await this.userRepo.update(id, { role });
    if (!affected) throw new NotFoundException("User not found.");
    this.logger.warn(`Admin ${admin.email} set the role of ${id} to ${role}.`);
    return { id, role };
  }

  private async countBy(
    expr: string,
    table: string,
    owned: string,
    id: string,
  ): Promise<Record<string, number>> {
    const rows: { key: string; n: number }[] = await this.db.query(
      `SELECT ${expr} AS key, count(*)::int AS n FROM ${table}
        WHERE "projectId" IN (${owned}) GROUP BY 1`,
      [id],
    );
    return Object.fromEntries(rows.map((row) => [row.key, row.n]));
  }

  // Projects the user was added to by someone else. Empty until project
  // membership exists in this database.
  private async memberships(id: string) {
    const [{ exists }] = await this.db.query(
      `SELECT to_regclass('public.project_members') IS NOT NULL AS exists`,
    );
    if (!exists) return [];
    return this.db.query(
      `SELECT p.id, p.name, m.role, m."createdAt",
              json_build_object('id', o.id, 'name', o.name, 'email', o.email) AS owner
         FROM project_members m
         JOIN projects p ON p.id = m."projectId"
         LEFT JOIN users o ON o.id = p."ownerId"
        WHERE m."userId" = $1
        ORDER BY m."createdAt" DESC`,
      [id],
    );
  }
}
