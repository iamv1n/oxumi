import type { DraftFlow, NodeLayout } from "@oxumi/flow-core";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Project } from "../projects/project.entity";

// A call agent: a flow plus how it should sound and which model runs it.
@Entity("agents")
export class Agent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column()
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  // "<provider>:<model>", or empty to use the server default.
  @Column({ type: "varchar", default: "" })
  model!: string;

  // Speech provider id for voice calls, or empty to use whichever the
  // project has connected.
  @Column({ type: "varchar", default: "" })
  speech!: string;

  // Telephony provider for this agent's phone calls ("twilio" | "exotel" | "vobiz"),
  // or empty to use whichever the project has connected.
  @Column({ type: "varchar", default: "" })
  telephony!: string;

  // The number this agent calls from, overriding the provider's default
  // (a Twilio number, or an ExoPhone). Empty uses the default.
  @Column({ type: "varchar", default: "" })
  phoneNumber!: string;

  // Whether the agent may answer side questions from the project's
  // knowledge base.
  @Column({ default: true })
  knowledge!: boolean;

  // Stored as the builder left it, complete or not; see checkFlow.
  @Column({ type: "jsonb" })
  flow!: DraftFlow;

  // Node positions on the builder canvas.
  @Column({ type: "jsonb", default: {} })
  layout!: NodeLayout;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
