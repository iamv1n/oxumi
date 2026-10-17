import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsModule } from "../projects/projects.module";
import { WebhookDelivery, WebhookEndpoint } from "./webhook.entity";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]), ProjectsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
