import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsModule } from "../projects/projects.module";
import { ComplianceController } from "./compliance.controller";
import { ComplianceSettings, ConsentRecord, DoNotCall } from "./compliance.entity";
import { ComplianceService } from "./compliance.service";

@Module({
  imports: [TypeOrmModule.forFeature([ComplianceSettings, DoNotCall, ConsentRecord]), ProjectsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
