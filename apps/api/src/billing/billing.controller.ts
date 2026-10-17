import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.guard";
import type { AuthUser } from "../auth/auth.service";
import { actorOf } from "../projects/audit.service";
import { BillingService } from "./billing.service";

@Controller("projects/:projectId/billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get()
  report(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Query("month") month?: string,
  ) {
    return this.billing.report(projectId, user.id, month);
  }

  @Put("limit")
  update(
    @CurrentUser() user: AuthUser,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: { monthlyCap?: unknown; alertPercent?: unknown },
  ) {
    return this.billing.update(projectId, { ...actorOf(user), id: user.id }, body ?? {});
  }
}
