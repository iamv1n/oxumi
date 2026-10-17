import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { MailService } from "../auth/mail.service";
import type { Channel } from "../calls/call.entity";
import { AppConfig } from "../config";
import { type Actor, AuditService, SYSTEM } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { BillingSettings } from "./billing.entity";
import { billableMinutes, costOf, CURRENCY, RATES, type Rates } from "./pricing";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface UsageReport {
  month: string;
  currency: string;
  rates: Rates;
  total: number;
  calls: number;
  minutes: number;
  // Every day of the month up to today, including days with no spend.
  byDay: { date: string; cost: number; calls: number }[];
  byChannel: { channel: Channel; cost: number; calls: number; minutes: number }[];
  byAgent: { agentId: string; agentName: string; cost: number; calls: number; minutes: number }[];
  limit: LimitView;
}

export interface LimitView {
  monthlyCap: number | null;
  alertPercent: number;
  // Share of the cap spent this month, 0 to 1 and beyond; null without a cap.
  used: number | null;
  reached: boolean;
}

interface Row {
  channel: Channel;
  startedAt: Date;
  endedAt: Date | null;
  agentId: string;
  agentName: string | null;
  turns: number;
}

const round = (value: number) => Math.round(value * 100) / 100;
const monthOf = (date: Date) => date.toISOString().slice(0, 7);

function range(month: string): { from: Date; to: Date } {
  const [year, m] = month.split("-").map(Number);
  return { from: new Date(Date.UTC(year!, m! - 1, 1)), to: new Date(Date.UTC(year!, m!, 1)) };
}

// What a project has spent on calls, and the limit it has set itself.
@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(BillingSettings) private settings: Repository<BillingSettings>,
    @InjectDataSource() private db: DataSource,
    private projects: ProjectsService,
    private audit: AuditService,
    private mail: MailService,
    private config: AppConfig,
  ) {}

  private async rows(projectId: string, month: string): Promise<Row[]> {
    const { from, to } = range(month);
    return this.db.query(
      `SELECT c.channel, c."startedAt", c."endedAt", c."agentId", a.name AS "agentName",
              (SELECT count(*)::int FROM turns t WHERE t."callId" = c.id) AS turns
         FROM calls c
         LEFT JOIN agents a ON a.id = c."agentId"
        WHERE c."projectId" = $1 AND c."startedAt" >= $2 AND c."startedAt" < $3`,
      [projectId, from, to],
    );
  }

  async spend(projectId: string, month = monthOf(new Date())): Promise<number> {
    const rows = await this.rows(projectId, month);
    return round(rows.reduce((sum, row) => sum + costOf(row), 0));
  }

  private async limit(projectId: string, spent: number): Promise<LimitView> {
    const row = await this.settings.findOneBy({ projectId });
    const cap = row?.monthlyCap === null || row?.monthlyCap === undefined ? null : Number(row.monthlyCap);
    return {
      monthlyCap: cap,
      alertPercent: row?.alertPercent ?? 80,
      used: cap ? spent / cap : null,
      reached: cap !== null && spent >= cap,
    };
  }

  async report(projectId: string, userId: string, rawMonth?: string): Promise<UsageReport> {
    await this.projects.get(projectId, userId);
    const month = rawMonth && MONTH.test(rawMonth) ? rawMonth : monthOf(new Date());
    const rows = await this.rows(projectId, month);

    const days = new Map<string, { cost: number; calls: number }>();
    const { from, to } = range(month);
    // Up to and including today; never days that have not started.
    const last = Math.min(+to - 1, Date.now());
    for (let at = +from; at <= last; at += 86_400_000)
      days.set(new Date(at).toISOString().slice(0, 10), { cost: 0, calls: 0 });

    const channels = new Map<Channel, { cost: number; calls: number; minutes: number }>();
    const agents = new Map<string, { agentName: string; cost: number; calls: number; minutes: number }>();
    let total = 0;
    let minutes = 0;
    for (const row of rows) {
      const cost = costOf(row);
      const mins = billableMinutes(row);
      total += cost;
      minutes += mins;
      const day = days.get(new Date(row.startedAt).toISOString().slice(0, 10));
      if (day) {
        day.cost += cost;
        day.calls += 1;
      }
      const channel = channels.get(row.channel) ?? { cost: 0, calls: 0, minutes: 0 };
      channels.set(row.channel, { cost: channel.cost + cost, calls: channel.calls + 1, minutes: channel.minutes + mins });
      const agent = agents.get(row.agentId) ?? { agentName: row.agentName ?? "Deleted agent", cost: 0, calls: 0, minutes: 0 };
      agents.set(row.agentId, { ...agent, cost: agent.cost + cost, calls: agent.calls + 1, minutes: agent.minutes + mins });
    }

    // The limit applies to the current month only.
    const current = month === monthOf(new Date());
    return {
      month,
      currency: CURRENCY,
      rates: RATES,
      total: round(total),
      calls: rows.length,
      minutes,
      byDay: [...days].map(([date, day]) => ({ date, cost: round(day.cost), calls: day.calls })),
      byChannel: [...channels]
        .map(([channel, c]) => ({ channel, ...c, cost: round(c.cost) }))
        .sort((a, b) => b.cost - a.cost),
      byAgent: [...agents]
        .map(([agentId, a]) => ({ agentId, ...a, cost: round(a.cost) }))
        .sort((a, b) => b.cost - a.cost),
      limit: await this.limit(projectId, current ? total : await this.spend(projectId)),
    };
  }

  async update(
    projectId: string,
    actor: Actor & { id: string },
    input: { monthlyCap?: unknown; alertPercent?: unknown },
  ): Promise<LimitView> {
    await this.projects.get(projectId, actor.id, "admin");
    const row =
      (await this.settings.findOneBy({ projectId })) ??
      this.settings.create({ projectId, monthlyCap: null, alertPercent: 80, alertedMonth: "" });
    const before = { monthlyCap: row.monthlyCap === null ? null : Number(row.monthlyCap), alertPercent: row.alertPercent };

    if (input.monthlyCap !== undefined) {
      if (input.monthlyCap === null || input.monthlyCap === "") row.monthlyCap = null;
      else {
        const cap = Number(input.monthlyCap);
        if (!Number.isFinite(cap) || cap <= 0 || cap > 10_000_000)
          throw new BadRequestException("monthlyCap must be a positive amount, or null for no limit.");
        row.monthlyCap = cap.toFixed(2);
      }
      // A new limit gets its own alert.
      row.alertedMonth = "";
    }
    if (input.alertPercent !== undefined) {
      const percent = Number(input.alertPercent);
      if (!Number.isInteger(percent) || percent < 1 || percent > 100)
        throw new BadRequestException("alertPercent must be a whole number from 1 to 100.");
      row.alertPercent = percent;
    }
    await this.settings.save(row);
    await this.audit.record(projectId, actor, "billing.limit_changed", "", {
      before,
      after: { monthlyCap: row.monthlyCap === null ? null : Number(row.monthlyCap), alertPercent: row.alertPercent },
    });
    return this.limit(projectId, await this.spend(projectId));
  }

  // Stops a new call once the month's limit is reached.
  async assertWithinLimit(projectId: string): Promise<void> {
    const row = await this.settings.findOneBy({ projectId });
    if (!row || row.monthlyCap === null) return;
    const cap = Number(row.monthlyCap);
    if ((await this.spend(projectId)) < cap) return;
    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: "Spending limit reached",
        code: "spend_limit_reached",
        message: `This project has reached its monthly spending limit of ${CURRENCY} ${cap.toFixed(2)}. An admin can raise it under Billing.`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  // After each call: warn the owner and admins once a month when spend
  // passes the alert threshold.
  async afterCall(projectId: string): Promise<void> {
    const row = await this.settings.findOneBy({ projectId });
    if (!row || row.monthlyCap === null) return;
    const month = monthOf(new Date());
    if (row.alertedMonth === month) return;
    const cap = Number(row.monthlyCap);
    const spent = await this.spend(projectId, month);
    if (spent < (cap * row.alertPercent) / 100) return;

    row.alertedMonth = month;
    await this.settings.save(row);
    const recipients: { email: string; name: string }[] = await this.db.query(
      `SELECT u.email, u.name FROM projects p JOIN users u ON u.id = p."ownerId" WHERE p.id = $1
       UNION
       SELECT u.email, u.name FROM project_members m JOIN users u ON u.id = m."userId"
        WHERE m."projectId" = $1 AND m.role = 'admin'`,
      [projectId],
    );
    const [project] = await this.db.query(`SELECT name FROM projects WHERE id = $1`, [projectId]);
    const share = Math.floor((spent / cap) * 100);
    for (const person of recipients)
      await this.mail
        .send({
          to: person.email,
          subject: `${project?.name ?? "Your project"} has used ${share}% of its monthly limit`,
          text: [
            `"${project?.name}" has spent ${CURRENCY} ${spent.toFixed(2)} of its ${CURRENCY} ${cap.toFixed(2)} limit this month.`,
            share >= 100
              ? "New calls are now refused until the month ends or the limit is raised."
              : "New calls will be refused once the limit is reached.",
            "",
            `Review usage and the limit: ${this.config.webOrigin.replace(/\/$/, "")}/projects/${projectId}/billing`,
          ].join("\n"),
        })
        .catch((err: Error) => this.logger.warn(`Spend alert not sent: ${err.message}`));
    await this.audit.record(projectId, SYSTEM, "billing.alert_sent", `${share}% of limit`, {
      spent,
      cap,
      recipients: recipients.length,
    });
  }
}
