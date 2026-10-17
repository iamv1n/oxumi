import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeChunk, KnowledgeSource } from "./knowledge.entity";
import { KnowledgeService } from "./knowledge.service";

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeSource, KnowledgeChunk]), ProjectsModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
