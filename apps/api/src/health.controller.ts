import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/auth.guard";

// Liveness only. What a project can run on is at GET /projects/:id/providers.
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  status() {
    return { ok: true };
  }
}
