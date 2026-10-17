import { Module } from "@nestjs/common";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AgentsModule } from "../agents/agents.module";
import { CallsModule } from "../calls/calls.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { AgentCallsController } from "./agent-calls.controller";
import { ExotelGateway, TwilioGateway, VobizGateway } from "./phone.gateway";
import { PhoneService } from "./phone.service";
import { TelephonyController } from "./telephony.controller";

@Module({
  imports: [AgentsModule, CallsModule, ComplianceModule, KnowledgeModule],
  controllers: [TelephonyController, AgentCallsController],
  providers: [PhoneService, TwilioGateway, ExotelGateway, VobizGateway],
  exports: [PhoneService],
})
export class TelephonyModule {}
