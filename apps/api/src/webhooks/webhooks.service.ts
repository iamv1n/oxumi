import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "node:crypto";
import { LessThanOrEqual, Repository } from "typeorm";
import { open, seal } from "../credentials/vault";
import { AuditService } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { assertSafeUrl } from "./safe-url";
import { sign } from "./signature";
import {
  WEBHOOK_EVENTS,
  WebhookDelivery,
  WebhookEndpoint,
  type WebhookEvent,
} from "./webhook.entity";

export interface EndpointView {
  id: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: Date;
}

// Returned once, when an endpoint is created.
export interface NewEndpoint extends EndpointView {
  secret: string;
}

// Wait before each retry after a failed attempt. Six attempts in all, spread
// over roughly seven hours, then the delivery is marked failed.
const RETRY_AFTER_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];
const TIMEOUT_MS = 10_000;
const POLL_MS = 15_000;
const MAX_ENDPOINTS = 5;

const view = (e: WebhookEndpoint): EndpointView => ({
  id: e.id,
  url: e.url,
  events: e.events,
  enabled: e.enabled,
  createdAt: e.createdAt,
});

@Injectable()
export class WebhooksService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(WebhooksService.name);
  private poller?: NodeJS.Timeout;

  constructor(
    @InjectRepository(WebhookEndpoint) private endpoints: Repository<WebhookEndpoint>,
    @InjectRepository(WebhookDelivery) private deliveries: Repository<WebhookDelivery>,
    private projects: ProjectsService,
    private audit: AuditService,
  ) {}

  onModuleInit(): void {
    // Retries are driven from the database, so they survive a restart.
    this.poller = setInterval(() => void this.flush(), POLL_MS);
    this.poller.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.poller);
  }

  async list(projectId: string, userId: string): Promise<EndpointView[]> {
    await this.projects.get(projectId, userId);
    const rows = await this.endpoints.find({
      where: { projectId },
      order: { createdAt: "ASC" },
    });
    return rows.map(view);
  }

  async create(
    projectId: string,
    userId: string,
    input: { url?: unknown; events?: unknown },
  ): Promise<NewEndpoint> {
    await this.projects.get(projectId, userId, "admin");
    if ((await this.endpoints.countBy({ projectId })) >= MAX_ENDPOINTS)
      throw new BadRequestException(`A project can have at most ${MAX_ENDPOINTS} webhooks.`);
    const url = await assertSafeUrl(typeof input.url === "string" ? input.url.trim() : "");
    const events = Array.isArray(input.events)
      ? WEBHOOK_EVENTS.filter((e) => (input.events as unknown[]).includes(e))
      : [...WEBHOOK_EVENTS];
    if (!events.length) throw new BadRequestException("Choose at least one event.");

    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const endpoint = await this.endpoints.save(
      this.endpoints.create({
        projectId,
        url: url.toString(),
        sealedSecret: seal(secret),
        events,
        enabled: true,
      }),
    );
    await this.audit.recordBy(projectId, userId, "webhook.created", endpoint.url, { events });
    return { ...view(endpoint), secret };
  }

  private async owned(projectId: string, userId: string, id: string): Promise<WebhookEndpoint> {
    await this.projects.get(projectId, userId, "admin");
    const endpoint = await this.endpoints.findOneBy({ id, projectId });
    if (!endpoint) throw new NotFoundException("Webhook not found.");
    return endpoint;
  }

  async setEnabled(projectId: string, userId: string, id: string, enabled: unknown) {
    const endpoint = await this.owned(projectId, userId, id);
    endpoint.enabled = enabled === true;
    const saved = await this.endpoints.save(endpoint);
    await this.audit.recordBy(
      projectId,
      userId,
      saved.enabled ? "webhook.enabled" : "webhook.paused",
      saved.url,
    );
    return view(saved);
  }

  async remove(projectId: string, userId: string, id: string): Promise<void> {
    const endpoint = await this.owned(projectId, userId, id);
    const { url } = endpoint;
    await this.endpoints.remove(endpoint);
    await this.audit.recordBy(projectId, userId, "webhook.deleted", url);
  }

  async recent(projectId: string, userId: string): Promise<WebhookDelivery[]> {
    await this.projects.get(projectId, userId);
    return this.deliveries.find({
      where: { projectId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  // Sends a sample event so the receiver can be checked before a real call.
  async test(projectId: string, userId: string, id: string): Promise<WebhookDelivery> {
    const endpoint = await this.owned(projectId, userId, id);
    const delivery = await this.enqueue(endpoint, "ping", {
      message: "This is a test delivery from Oxumi.",
    });
    return this.attempt(delivery.id);
  }

  async retry(projectId: string, userId: string, deliveryId: string): Promise<WebhookDelivery> {
    await this.projects.get(projectId, userId, "admin");
    const delivery = await this.deliveries.findOneBy({ id: deliveryId, projectId });
    if (!delivery) throw new NotFoundException("Delivery not found.");
    await this.deliveries.update(delivery.id, { status: "pending", nextAttemptAt: new Date() });
    return this.attempt(delivery.id);
  }

  // Queues an event for every enabled endpoint subscribed to it, and makes
  // the first attempt straight away without holding up the caller.
  async emit(projectId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const endpoints = await this.endpoints.findBy({ projectId, enabled: true });
    for (const endpoint of endpoints) {
      if (!endpoint.events.includes(event)) continue;
      const delivery = await this.enqueue(endpoint, event, data);
      void this.attempt(delivery.id).catch((err) =>
        this.logger.warn(`Webhook attempt failed to start: ${String(err)}`),
      );
    }
  }

  private enqueue(endpoint: WebhookEndpoint, event: string, data: Record<string, unknown>) {
    return this.deliveries.save(
      this.deliveries.create({
        endpointId: endpoint.id,
        projectId: endpoint.projectId,
        event,
        payload: { event, createdAt: new Date().toISOString(), data },
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
      }),
    );
  }

  private async flush(): Promise<void> {
    const due = await this.deliveries.find({
      where: { status: "pending", nextAttemptAt: LessThanOrEqual(new Date()) },
      order: { nextAttemptAt: "ASC" },
      take: 20,
    });
    for (const delivery of due) await this.attempt(delivery.id).catch(() => undefined);
  }

  private async attempt(deliveryId: string): Promise<WebhookDelivery> {
    // Claim the row first, so the poller and an immediate attempt cannot both
    // send the same delivery.
    const claimed = await this.deliveries
      .createQueryBuilder()
      .update()
      .set({ nextAttemptAt: null })
      .where("id = :deliveryId AND status = 'pending' AND \"nextAttemptAt\" IS NOT NULL", {
        deliveryId,
      })
      .execute();
    const delivery = await this.deliveries.findOneByOrFail({ id: deliveryId });
    if (!claimed.affected) return delivery;

    const endpoint = await this.endpoints
      .createQueryBuilder("e")
      .addSelect("e.sealedSecret")
      .where("e.id = :id", { id: delivery.endpointId })
      .getOne();
    if (!endpoint) return delivery;

    const body = JSON.stringify({ id: delivery.id, ...delivery.payload });
    const timestamp = Math.floor(Date.now() / 1000);
    let status: number | null = null;
    let error: string | null = null;
    try {
      // Re-checked on every attempt: a hostname can be re-pointed after it
      // was approved.
      const url = await assertSafeUrl(endpoint.url);
      const res = await fetch(url, {
        method: "POST",
        // A redirect could lead somewhere the URL check never saw.
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Oxumi-Webhooks/1",
          "Oxumi-Event": delivery.event,
          "Oxumi-Delivery": delivery.id,
          "Oxumi-Signature": sign(open(endpoint.sealedSecret), timestamp, body),
        },
        body,
      });
      status = res.status;
      await res.body?.cancel();
      if (status < 200 || status >= 300) error = `The endpoint answered ${status}.`;
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 300) : "The request failed.";
    }

    delivery.attempts += 1;
    delivery.lastStatus = status;
    delivery.lastError = error;
    if (!error) {
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      delivery.nextAttemptAt = null;
    } else {
      const wait = RETRY_AFTER_MS[delivery.attempts - 1];
      delivery.status = wait === undefined ? "failed" : "pending";
      delivery.nextAttemptAt = wait === undefined ? null : new Date(Date.now() + wait);
    }
    return this.deliveries.save(delivery);
  }
}
