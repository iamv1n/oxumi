import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Project } from "./project.entity";

// One change made to a project: who did it, what they did and to what.
// Rows are only ever added.
@Entity("audit_events")
@Index(["projectId", "createdAt"])
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // Null when the change came from the system, e.g. an opt-out on a call.
  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  // The actor's name and email at the time, kept if their account goes.
  @Column({ type: "varchar", default: "" })
  actorLabel!: string;

  // A dotted verb, e.g. "agent.updated", "member.invited".
  @Column({ type: "varchar" })
  action!: string;

  // What was changed, in words: an agent's name, an email, a number.
  @Column({ type: "varchar", default: "" })
  target!: string;

  @Column({ type: "jsonb", default: {} })
  details!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
