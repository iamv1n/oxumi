import { Module } from "@nestjs/common";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentsModule } from "../agents/agents.module";
import { CallsModule } from "../calls/calls.module";
import { ProjectsModule } from "../projects/projects.module";
import { TelephonyModule } from "../telephony/telephony.module";
import { ApiCallsService } from "./api-calls.service";
import { ApiKeyGuard } from "./api-key.guard";
import { ApiKey } from "./api-key.entity";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { ApiUsage } from "./api-usage.entity";
import { V1Controller } from "./v1.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, ApiUsage]),
    ProjectsModule,
    AgentsModule,
    CallsModule,
    TelephonyModule,
    KnowledgeModule,
  ],
  controllers: [ApiKeysController, V1Controller],
  providers: [ApiKeysService, ApiCallsService, ApiKeyGuard],
})
export class PublicApiModule {}
