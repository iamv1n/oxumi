import { Module } from "@nestjs/common";
import { AgentsModule } from "../agents/agents.module";
import { FlowsModule } from "../flows/flows.module";
import { ProjectsModule } from "../projects/projects.module";
import { FlowAiController } from "./flow-ai.controller";
import { FlowAiService } from "./flow-ai.service";

// Drafts and edits call flows from a plain-language brief.
@Module({
  imports: [AgentsModule, ProjectsModule, FlowsModule],
  controllers: [FlowAiController],
  providers: [FlowAiService],
})
export class FlowAiModule {}
