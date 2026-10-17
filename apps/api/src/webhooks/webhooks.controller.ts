import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { WebhooksService } from "./webhooks.service";

@Controller("projects/:projectId")
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get("webhooks")
  list(@CurrentUser() user: AuthUser, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.webhooks.list(projectId, user.id);
  }

  @Post("webhooks")
  create(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { url?: unknown; events?: unknown },
  ) {
    return this.webhooks.create(projectId, user.id, body ?? {});
  }

  @Patch("webhooks/:id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { enabled?: unknown },
  ) {
    return this.webhooks.setEnabled(projectId, user.id, id, body?.enabled);
  }

  @Delete("webhooks/:id")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.webhooks.remove(projectId, user.id, id);
  }

  @Post("webhooks/:id/test")
  @HttpCode(200)
  test(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.webhooks.test(projectId, user.id, id);
  }

  @Get("webhook-deliveries")
  deliveries(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.webhooks.recent(projectId, user.id);
  }

  @Post("webhook-deliveries/:id/retry")
  @HttpCode(200)
  retry(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.webhooks.retry(projectId, user.id, id);
  }
}
