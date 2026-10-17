import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PHONE_NUMBER } from "@oxumi/flow-core";
import { In, Repository } from "typeorm";
import { type Actor, AuditService } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { ComplianceSettings, ConsentRecord, type DncReason, DoNotCall } from "./compliance.entity";
import { type CallingHours, DEFAULT_HOURS, describeHours, nextWindow, withinHours } from "./hours";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_IMPORT = 5000;

export interface SettingsView {
  timezone: string;
  callingHours: CallingHours;
  disclosure: string;
  requireConsent: boolean;
  honourOptOuts: boolean;
}

// Why a call may not be placed, in a form both people and code can read.
export interface Block {
  code: "do_not_call" | "outside_hours" | "no_consent";
  message: string;
}

export const normaliseNumber = (raw: unknown): string =>
  typeof raw === "string" ? raw.replace(/[\s()-]/g, "") : "";

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceSettings) private settings: Repository<ComplianceSettings>,
    @InjectRepository(DoNotCall) private dnc: Repository<DoNotCall>,
    @InjectRepository(ConsentRecord) private consents: Repository<ConsentRecord>,
    private projects: ProjectsService,
    private audit: AuditService,
  ) {}

  // A project without saved rules gets the defaults.
  async rules(projectId: string): Promise<SettingsView> {
    const row = await this.settings.findOneBy({ projectId });
    return {
      timezone: row?.timezone ?? "Asia/Kolkata",
      callingHours: row?.callingHours ?? DEFAULT_HOURS,
      disclosure: row?.disclosure ?? "",
      requireConsent: row?.requireConsent ?? false,
      honourOptOuts: row?.honourOptOuts ?? true,
    };
  }

  async read(projectId: string, userId: string): Promise<SettingsView> {
    await this.projects.get(projectId, userId);
    return this.rules(projectId);
  }

  async update(
    projectId: string,
    actor: Actor & { id: string },
    input: Partial<Record<keyof SettingsView, unknown>>,
  ): Promise<SettingsView> {
    await this.projects.get(projectId, actor.id, "admin");
    const before = await this.rules(projectId);
    const next = { ...before };

    if (input.timezone !== undefined) {
      if (typeof input.timezone !== "string" || !isTimeZone(input.timezone))
        throw new BadRequestException('timezone must be a time zone such as "Asia/Kolkata".');
      next.timezone = input.timezone;
    }
    if (input.callingHours !== undefined) next.callingHours = parseHours(input.callingHours);
    if (input.disclosure !== undefined) {
      if (typeof input.disclosure !== "string") throw new BadRequestException("disclosure must be text.");
      next.disclosure = input.disclosure.trim().slice(0, 300);
    }
    if (input.requireConsent !== undefined) next.requireConsent = input.requireConsent === true;
    if (input.honourOptOuts !== undefined) next.honourOptOuts = input.honourOptOuts === true;

    await this.settings.save(this.settings.create({ projectId, ...next }));
    const changed = (Object.keys(next) as (keyof SettingsView)[]).filter(
      (key) => JSON.stringify(next[key]) !== JSON.stringify(before[key]),
    );
    if (changed.length)
      await this.audit.record(projectId, actor, "compliance.updated", changed.join(", "), {
        before: Object.fromEntries(changed.map((key) => [key, before[key]])),
        after: Object.fromEntries(changed.map((key) => [key, next[key]])),
      });
    return next;
  }

  // ---- Do-not-call list ----------------------------------------------------

  async listDnc(projectId: string, userId: string, search?: string): Promise<DoNotCall[]> {
    await this.projects.get(projectId, userId);
    const query = this.dnc
      .createQueryBuilder("d")
      .where("d.projectId = :projectId", { projectId })
      .orderBy("d.createdAt", "DESC")
      .take(500);
    const digits = (search ?? "").replace(/[^\d+]/g, "");
    if (digits) query.andWhere("d.number LIKE :like", { like: `%${digits}%` });
    return query.getMany();
  }

  // Adds numbers by hand or from a pasted list. Returns how many were new and
  // which entries were not numbers.
  async addDnc(
    projectId: string,
    actor: Actor & { id: string },
    input: { numbers?: unknown; note?: unknown },
  ): Promise<{ added: number; invalid: string[] }> {
    await this.projects.get(projectId, actor.id, "editor");
    const raw = Array.isArray(input.numbers)
      ? input.numbers
      : typeof input.numbers === "string"
        ? input.numbers.split(/[\n,;]+/)
        : [];
    if (raw.length > MAX_IMPORT)
      throw new BadRequestException(`Add at most ${MAX_IMPORT} numbers at a time.`);
    const invalid: string[] = [];
    const numbers = new Set<string>();
    for (const entry of raw) {
      const number = normaliseNumber(entry);
      if (!number) continue;
      if (PHONE_NUMBER.test(number)) numbers.add(number);
      else invalid.push(String(entry).trim());
    }
    const note = typeof input.note === "string" ? input.note.slice(0, 200) : "";
    const reason: DncReason = raw.length > 1 ? "imported" : "manual";
    const added = await this.insertDnc(projectId, [...numbers], reason, note, null);
    if (added)
      await this.audit.record(
        projectId,
        actor,
        "dnc.added",
        added === 1 ? [...numbers][0]! : `${added} numbers`,
        { reason },
      );
    return { added, invalid: invalid.slice(0, 50) };
  }

  async removeDnc(projectId: string, actor: Actor & { id: string }, number: string): Promise<void> {
    await this.projects.get(projectId, actor.id, "admin");
    const result = await this.dnc.delete({ projectId, number: normaliseNumber(number) });
    if (result.affected) await this.audit.record(projectId, actor, "dnc.removed", normaliseNumber(number));
  }

  // A caller said they do not want these calls. Called by the runtime.
  async optOut(projectId: string, number: string, callId: string, actor: Actor): Promise<void> {
    const rules = await this.rules(projectId);
    if (!rules.honourOptOuts || !PHONE_NUMBER.test(number)) return;
    const added = await this.insertDnc(projectId, [number], "opted_out", "Opted out on a call", callId);
    if (added) await this.audit.record(projectId, actor, "dnc.opted_out", number, { callId });
  }

  private async insertDnc(
    projectId: string,
    numbers: string[],
    reason: DncReason,
    note: string,
    callId: string | null,
  ): Promise<number> {
    if (!numbers.length) return 0;
    const result = await this.dnc
      .createQueryBuilder()
      .insert()
      .values(numbers.map((number) => ({ projectId, number, reason, note, callId })))
      .orIgnore()
      .execute();
    return Array.isArray(result.raw) ? result.raw.length : 0;
  }

  // ---- Consent -------------------------------------------------------------

  async listConsent(projectId: string, userId: string, number?: string): Promise<ConsentRecord[]> {
    await this.projects.get(projectId, userId);
    return this.consents.find({
      where: { projectId, ...(number ? { number: normaliseNumber(number) } : {}) },
      order: { createdAt: "DESC" },
      take: 500,
    });
  }

  async recordConsent(
    projectId: string,
    actor: Actor,
    input: { number?: unknown; given?: unknown; source?: unknown; note?: unknown; capturedAt?: unknown },
  ): Promise<ConsentRecord> {
    const number = normaliseNumber(input.number);
    if (!PHONE_NUMBER.test(number))
      throw new BadRequestException('number must be in international format, e.g. "+919876543210".');
    const captured = typeof input.capturedAt === "string" ? new Date(input.capturedAt) : new Date();
    if (Number.isNaN(+captured) || +captured > Date.now() + 60_000)
      throw new BadRequestException("capturedAt must be a date that is not in the future.");
    const record = await this.consents.save(
      this.consents.create({
        projectId,
        number,
        given: input.given !== false,
        source: typeof input.source === "string" ? input.source.slice(0, 80) : "",
        note: typeof input.note === "string" ? input.note.slice(0, 300) : "",
        capturedAt: captured,
      }),
    );
    await this.audit.record(projectId, actor, record.given ? "consent.given" : "consent.withdrawn", number, {
      source: record.source,
    });
    return record;
  }

  // ---- The check ------------------------------------------------------------

  // Everything that stops a phone call to `number` right now. Empty means it
  // may be placed.
  async blocks(projectId: string, number: string, at = new Date()): Promise<Block[]> {
    const rules = await this.rules(projectId);
    const blocks: Block[] = [];
    if (await this.dnc.existsBy({ projectId, number }))
      blocks.push({
        code: "do_not_call",
        message: `${number} is on this project's do-not-call list.`,
      });
    if (!withinHours(rules.callingHours, rules.timezone, at)) {
      const next = nextWindow(rules.callingHours, rules.timezone, at);
      blocks.push({
        code: "outside_hours",
        message: `Calls are allowed ${describeHours(rules.callingHours, rules.timezone)}.${
          next ? ` The next window opens at ${next.toISOString()}.` : ""
        }`,
      });
    }
    if (rules.requireConsent) {
      const latest = await this.consents.findOne({
        where: { projectId, number },
        order: { capturedAt: "DESC", createdAt: "DESC" },
      });
      if (!latest?.given)
        blocks.push({
          code: "no_consent",
          message: latest
            ? `${number} withdrew consent to be called.`
            : `This project only calls numbers with recorded consent, and ${number} has none.`,
        });
    }
    return blocks;
  }

  async check(projectId: string, userId: string, number: unknown) {
    await this.projects.get(projectId, userId);
    const to = normaliseNumber(number);
    if (!PHONE_NUMBER.test(to))
      throw new BadRequestException('Enter a number in international format, e.g. "+919876543210".');
    const blocks = await this.blocks(projectId, to);
    return { number: to, allowed: blocks.length === 0, blocks };
  }

  // Numbers in a list that are on the do-not-call list, for bulk checks.
  async blockedOf(projectId: string, numbers: string[]): Promise<Set<string>> {
    if (!numbers.length) return new Set();
    const rows = await this.dnc.findBy({ projectId, number: In(numbers) });
    return new Set(rows.map((row) => row.number));
  }
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function parseHours(raw: unknown): CallingHours {
  if (typeof raw !== "object" || raw === null)
    throw new BadRequestException("callingHours must be an object.");
  const input = raw as Record<string, unknown>;
  const start = typeof input.start === "string" ? input.start : "";
  const end = typeof input.end === "string" ? input.end : "";
  if (!TIME.test(start) || !TIME.test(end) || start === end)
    throw new BadRequestException('Calling hours need a start and end such as "09:00" and "21:00".');
  const days = Array.isArray(input.days)
    ? [...new Set(input.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : [];
  if (input.enabled !== false && !days.length)
    throw new BadRequestException("Choose at least one day calls are allowed.");
  return { enabled: input.enabled !== false, start, end, days };
}
