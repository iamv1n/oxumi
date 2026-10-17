import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { User } from "../auth/user.entity";
import { AuditEvent } from "./audit.entity";

// Who made a change. A user, or the system acting on its own.
export interface Actor {
  id: string | null;
  label: string;
}

export const SYSTEM: Actor = { id: null, label: "Oxumi" };

// An operator acting as someone else is named too, so the log shows who
// really made the change.
export function actorOf(user: {
  id: string;
  name: string;
  email: string;
  impersonator?: { email: string } | null;
}): Actor {
  const who = user.name ? `${user.name} (${user.email})` : user.email;
  return { id: user.id, label: user.impersonator ? `${who} via ${user.impersonator.email}` : who };
}

const PAGE = 100;

@Injectable()
export class AuditService {
  private logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent) private events: Repository<AuditEvent>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  // For services that know only the acting user's id.
  async recordBy(
    projectId: string,
    userId: string,
    action: string,
    target = "",
    details: Record<string, unknown> = {},
  ): Promise<void> {
    const user = await this.users.findOneBy({ id: userId }).catch(() => null);
    await this.record(projectId, user ? actorOf(user) : { id: userId, label: "" }, action, target, details);
  }

  // Never fails the change it describes: a lost audit row is logged instead.
  async record(
    projectId: string,
    actor: Actor,
    action: string,
    target = "",
    details: Record<string, unknown> = {},
  ): Promise<void> {
    await this.events
      .save(
        this.events.create({
          projectId,
          actorId: actor.id,
          actorLabel: actor.label,
          action,
          target: target.slice(0, 200),
          details,
        }),
      )
      .catch((err: Error) => this.logger.error(`Audit "${action}" not recorded: ${err.message}`));
  }

  // Newest first, a page at a time; `before` is the createdAt of the last row seen.
  list(projectId: string, before?: string): Promise<AuditEvent[]> {
    const cursor = before ? new Date(before) : null;
    return this.events.find({
      where: {
        projectId,
        ...(cursor && !Number.isNaN(+cursor) ? { createdAt: LessThan(cursor) } : {}),
      },
      order: { createdAt: "DESC" },
      take: PAGE,
    });
  }
}
