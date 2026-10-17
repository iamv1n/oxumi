import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { AppConfig } from "../config";
import { LlmRegistry } from "../llm/registry";
import { actorOf, AuditService } from "../projects/audit.service";
import { ProjectsService } from "../projects/projects.service";
import { SpeechRegistry } from "../speech/registry";
import { PhoneService } from "../telephony/phone.service";
import { CredentialsService } from "./credentials.service";
import { verifyKey } from "./verify";

// A project's connections to outside providers: its own API keys for
// language models and speech services.
@Controller("projects/:projectId")
export class CredentialsController {
  constructor(
    private credentials: CredentialsService,
    private projects: ProjectsService,
    private llm: LlmRegistry,
    private speech: SpeechRegistry,
    private config: AppConfig,
    private phone: PhoneService,
    private audit: AuditService,
  ) {}

  @Get("credentials")
  async list(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    await this.projects.get(projectId, user.id);
    return this.credentials.list(projectId);
  }

  @Put("credentials/:provider")
  @HttpCode(204)
  async save(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("provider") provider: string,
    @Body() body: { secret?: unknown; options?: unknown },
  ) {
    await this.projects.get(projectId, user.id, "admin");
    await this.credentials.save(projectId, provider, body ?? {});
    this.llm.forget(projectId);
    // The key itself is never logged.
    await this.audit.record(projectId, actorOf(user), "credential.saved", provider);
  }

  @Delete("credentials/:provider")
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("provider") provider: string,
  ) {
    await this.projects.get(projectId, user.id, "admin");
    await this.credentials.remove(projectId, provider);
    this.llm.forget(projectId);
    await this.audit.record(projectId, actorOf(user), "credential.removed", provider);
  }

  // Tries the saved key against the provider and records the result.
  @Post("credentials/:provider/verify")
  @HttpCode(200)
  async verify(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("provider") provider: string,
  ) {
    await this.projects.get(projectId, user.id, "admin");
    const credential = await this.credentials.resolve(projectId, provider);
    if (!credential || credential.source !== "project")
      throw new NotFoundException("Save a key for this provider first.");
    const error = await verifyKey(
      provider,
      credential.secret,
      this.config.elevenLabs.host,
      credential.options,
    );
    await this.credentials.markVerified(projectId, provider, error);
    this.llm.forget(projectId);
    return { ok: error === null, error };
  }

  // What this project can run calls on right now: the language models and
  // speech services reachable with its own keys or the server's.
  @Get("providers")
  async providers(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    await this.projects.get(projectId, user.id);
    const speech = await this.speech.describe(projectId);
    const ready = speech.filter((s) => s.available);
    return {
      defaultModel: await this.llm.defaultRef(projectId),
      providers: await this.llm.describe(projectId),
      speech,
      voice: ready.length > 0,
      voiceIdSet: ready.some((s) => s.voiceSet),
      phone: await this.phone.readiness(projectId),
    };
  }
}
