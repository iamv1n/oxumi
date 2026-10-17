import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsModule } from "../projects/projects.module";
import { BillingController } from "./billing.controller";
import { BillingSettings } from "./billing.entity";
import { BillingService } from "./billing.service";

@Module({
  imports: [TypeOrmModule.forFeature([BillingSettings]), ProjectsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
