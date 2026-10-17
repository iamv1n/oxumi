import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FlowsModule } from "../flows/flows.module";
import { ProjectsModule } from "../projects/projects.module";
import { Agent } from "./agent.entity";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), ProjectsModule, FlowsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
