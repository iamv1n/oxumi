import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "./admin/admin.module";
import { AgentsModule } from "./agents/agents.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { CallsModule } from "./calls/calls.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { AppConfig } from "./config";
import { CredentialsModule } from "./credentials/credentials.module";
import { FlowAiModule } from "./flow-ai/flow-ai.module";
import { FlowsModule } from "./flows/flows.module";
import { HealthController } from "./health.controller";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { ProjectsModule } from "./projects/projects.module";
import { ProvidersModule } from "./providers.module";
import { PublicApiModule } from "./public-api/public-api.module";
import { TelephonyModule } from "./telephony/telephony.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ProvidersModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        type: "postgres" as const,
        url: config.databaseUrl,
        autoLoadEntities: true,
        // Entities drive the schema in development only. Production must run
        // migrations, so a deploy can never alter tables on its own.
        synchronize: process.env.NODE_ENV !== "production",
      }),
    }),
    AuthModule,
    FlowsModule,
    ProjectsModule,
    AgentsModule,
    CallsModule,
    WebhooksModule,
    TelephonyModule,
    PublicApiModule,
    CredentialsModule,
    ComplianceModule,
    BillingModule,
    KnowledgeModule,
    AdminModule,
    FlowAiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
