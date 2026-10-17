import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../auth/user.entity";
import { AuditEvent } from "./audit.entity";
import { AuditService } from "./audit.service";
import { ProjectInvite, ProjectMember } from "./member.entity";
import { MembersService } from "./members.service";
import { Project } from "./project.entity";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { InvitesController, TeamController } from "./team.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, ProjectInvite, AuditEvent, User])],
  controllers: [ProjectsController, TeamController, InvitesController],
  providers: [ProjectsService, AuditService, MembersService],
  exports: [ProjectsService, AuditService],
})
export class ProjectsModule {}
