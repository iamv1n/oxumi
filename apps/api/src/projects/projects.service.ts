import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { atLeast, type Role } from "./access";
import { type Actor, AuditService } from "./audit.service";
import { ProjectMember } from "./member.entity";
import { Project } from "./project.entity";

// A project as one person sees it: with the role they have in it.
export type ProjectWithRole = Project & { role: Role };

const ROLE_WORD: Record<Role, string> = {
  viewer: "a viewer",
  editor: "an editor",
  admin: "an admin",
  owner: "the owner",
};

export interface ProjectStats {
  agents: number;
  calls: number;
  completed: number;
  outcomes: Record<string, number>;
  // Medians over every recorded turn, in milliseconds; null until there are any.
  medianFirstTextMs: number | null;
  medianFirstAudioMs: number | null;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    @InjectDataSource() private db: DataSource,
    private audit: AuditService,
  ) {}

  // Projects the user owns or is a member of, each with their role.
  async list(
    userId: string,
  ): Promise<(ProjectWithRole & { agentCount: number; callCount: number })[]> {
    return this.db.query(
      `SELECT p.*,
              CASE WHEN p."ownerId" = $1 THEN 'owner' ELSE m.role END AS role,
              (SELECT count(*)::int FROM agents a WHERE a."projectId" = p.id) AS "agentCount",
              (SELECT count(*)::int FROM calls c WHERE c."projectId" = p.id) AS "callCount"
         FROM projects p
         LEFT JOIN project_members m ON m."projectId" = p.id AND m."userId" = $1
        WHERE p."ownerId" = $1 OR m."userId" = $1
        ORDER BY p."createdAt" DESC`,
      [userId],
    );
  }

  // The user's role in a project, or null when they have none.
  async roleOf(id: string, userId: string): Promise<{ project: Project; role: Role } | null> {
    const project = await this.projects.findOneBy({ id });
    if (!project) return null;
    if (project.ownerId === userId) return { project, role: "owner" };
    const member = await this.members.findOneBy({ projectId: id, userId });
    return member ? { project, role: member.role } : null;
  }

  // Also the access check. A project the user is not part of looks like no
  // project; one where their role is too low says which role is needed.
  async get(id: string, userId: string, need: Role = "viewer"): Promise<ProjectWithRole> {
    const access = await this.roleOf(id, userId);
    if (!access) throw new NotFoundException("Project not found.");
    if (!atLeast(access.role, need))
      throw new ForbiddenException(
        `Only ${need === "owner" ? "the owner" : `${need}s and above`} can do this; you are ${ROLE_WORD[access.role]} in this project.`,
      );
    return Object.assign(access.project, { role: access.role });
  }

  async create(
    ownerId: string,
    input: { name?: unknown; description?: unknown },
  ): Promise<ProjectWithRole> {
    const project = await this.projects.save(
      this.projects.create({
        ownerId,
        name: requireName(input.name),
        description: typeof input.description === "string" ? input.description : "",
      }),
    );
    return Object.assign(project, { role: "owner" as const });
  }

  async update(
    id: string,
    actor: Actor & { id: string },
    input: { name?: unknown; description?: unknown },
  ): Promise<ProjectWithRole> {
    const project = await this.get(id, actor.id, "admin");
    const before = { name: project.name, description: project.description };
    if (input.name !== undefined) project.name = requireName(input.name);
    if (typeof input.description === "string") project.description = input.description;
    const { role, ...row } = project;
    const saved = await this.projects.save(row);
    await this.audit.record(id, actor, "project.updated", saved.name, {
      before,
      after: { name: saved.name, description: saved.description },
    });
    return Object.assign(saved, { role });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const { role: _role, ...project } = await this.get(id, ownerId, "owner");
    await this.projects.remove(project as Project);
  }

  async stats(id: string, userId: string): Promise<ProjectStats> {
    await this.get(id, userId);
    const [{ agents }] = await this.db.query(
      `SELECT count(*)::int AS agents FROM agents WHERE "projectId" = $1`,
      [id],
    );
    const outcomeRows: { outcome: string | null; n: number }[] = await this.db.query(
      `SELECT outcome, count(*)::int AS n FROM calls WHERE "projectId" = $1 GROUP BY outcome`,
      [id],
    );
    const [latency] = await this.db.query(
      `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY t."llmMs") AS text,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY t."audioMs") AS audio
         FROM turns t JOIN calls c ON c.id = t."callId"
        WHERE c."projectId" = $1`,
      [id],
    );
    const outcomes: Record<string, number> = {};
    for (const row of outcomeRows) outcomes[row.outcome ?? "in_progress"] = row.n;
    return {
      agents,
      calls: outcomeRows.reduce((sum, row) => sum + row.n, 0),
      completed: outcomes.completed ?? 0,
      outcomes,
      medianFirstTextMs: latency.text === null ? null : Math.round(latency.text),
      medianFirstAudioMs: latency.audio === null ? null : Math.round(latency.audio),
    };
  }
}

export function requireName(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new BadRequestException("A name is required.");
  return value.trim().slice(0, 80);
}
