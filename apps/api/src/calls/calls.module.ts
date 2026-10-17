import { Module } from "@nestjs/common";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentsModule } from "../agents/agents.module";
import { BillingModule } from "../billing/billing.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { ProjectsModule } from "../projects/projects.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { Call } from "./call.entity";
import { CallsController } from "./calls.controller";
import { CallsGateway } from "./calls.gateway";
import { CallsService } from "./calls.service";
import { Turn } from "./turn.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, Turn]),
    AgentsModule,
    ProjectsModule,
    WebhooksModule,
    ComplianceModule,
    BillingModule,
    KnowledgeModule,
  ],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
