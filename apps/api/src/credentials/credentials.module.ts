import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { TelephonyModule } from "../telephony/telephony.module";
import { CredentialsController } from "./credentials.controller";

@Module({
  imports: [ProjectsModule, TelephonyModule],
  controllers: [CredentialsController],
})
export class CredentialsModule {}
