import { Controller, Get, Param } from "@nestjs/common";
import { FlowsService } from "./flows.service";

// Ready-made flows a new agent can start from.
@Controller("templates")
export class FlowsController {
  constructor(private flows: FlowsService) {}

  @Get()
  list() {
    return this.flows.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.flows.get(id);
  }
}
