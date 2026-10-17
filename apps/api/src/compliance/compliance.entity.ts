import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Project } from "../projects/project.entity";
import { type CallingHours, DEFAULT_HOURS } from "./hours";

export type { CallingHours };

// A project's rules for who may be called, when, and what they are told.
// They apply to phone calls; test calls in the browser only hear the
// disclosure.
@Entity("compliance_settings")
export class ComplianceSettings {
  @PrimaryColumn("uuid")
  projectId!: string;

  @OneToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // An IANA zone such as "Asia/Kolkata".
  @Column({ type: "varchar", default: "Asia/Kolkata" })
  timezone!: string;

  @Column({ type: "jsonb", default: DEFAULT_HOURS })
  callingHours!: CallingHours;

  // Spoken before the flow's own opening, e.g. "This call is recorded".
  @Column({ type: "text", default: "" })
  disclosure!: string;

  // Phone calls only go to numbers with recorded consent.
  @Column({ default: false })
  requireConsent!: boolean;

  // Callers who opt out on a call are added to the do-not-call list.
  @Column({ default: true })
  honourOptOuts!: boolean;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

export type DncReason = "opted_out" | "manual" | "imported";

@Entity("do_not_call")
@Index(["projectId", "number"], { unique: true })
export class DoNotCall {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // International format.
  @Column({ type: "varchar" })
  number!: string;

  @Column({ type: "varchar" })
  reason!: DncReason;

  @Column({ type: "text", default: "" })
  note!: string;

  // The call the person opted out on, when that is how they were added.
  @Column({ type: "uuid", nullable: true })
  callId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

// Evidence that a person agreed, or stopped agreeing, to be called. Newest
// row per number wins.
@Entity("consent_records")
@Index(["projectId", "number", "createdAt"])
export class ConsentRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "varchar" })
  number!: string;

  @Column()
  given!: boolean;

  // Where it came from, in words: "website form", "API", "console".
  @Column({ type: "varchar", default: "" })
  source!: string;

  @Column({ type: "text", default: "" })
  note!: string;

  // When the person gave it, which can be before it was recorded here.
  @Column({ type: "timestamptz" })
  capturedAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
