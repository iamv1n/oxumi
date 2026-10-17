import type { FieldValue, Outcome } from "@oxumi/flow-core";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Agent } from "../agents/agent.entity";
import type { HandoffRecord } from "../runtime/call-session";
import { Turn } from "./turn.entity";

// api_text: a text conversation driven by another system over the public API.
// phone: an outbound phone call placed through the telephony provider.
export type Channel = "browser_voice" | "browser_text" | "api_text" | "phone";

// A phone call is queued, then ringing, before anyone is talking.
export type CallStatus = "queued" | "ringing" | "in_progress" | "ended";

@Entity("calls")
export class Call {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Index()
  @Column({ type: "uuid" })
  agentId!: string;

  @ManyToOne(() => Agent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "agentId" })
  agent!: Agent;

  @Column({ type: "varchar" })
  channel!: Channel;

  // "<provider>:<model>" the call ran on.
  @Column({ type: "varchar", default: "" })
  model!: string;

  @Column({ type: "jsonb" })
  variables!: Record<string, string>;

  @Column({ type: "jsonb", default: {} })
  fields!: Record<string, FieldValue>;

  @Column({ type: "varchar", nullable: true })
  outcome!: Outcome | null;

  @Column({ type: "varchar", default: "in_progress" })
  status!: CallStatus;

  // Why a call failed, in words, e.g. "Nobody answered."
  @Column({ type: "text", nullable: true })
  error!: string | null;

  // The number dialled, for phone calls.
  @Column({ type: "varchar", nullable: true })
  to!: string | null;

  // Whatever the caller of the API attached, returned unchanged in the
  // webhook so results can be matched to their own records.
  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, string>;

  // Which telephony provider placed the call ("twilio" | "exotel" | "vobiz").
  @Column({ type: "varchar", nullable: true })
  telephony!: string | null;

  // The telephony provider's id for this call.
  @Column({ type: "varchar", nullable: true })
  providerCallId!: string | null;

  // Proves a media stream or status callback belongs to this call.
  @Column({ type: "varchar", nullable: true, select: false })
  streamToken!: string | null;

  // Set when the agent handed the caller to a person, or tried to.
  @Column({ type: "jsonb", nullable: true })
  handoff!: HandoffRecord | null;

  @CreateDateColumn({ type: "timestamptz" })
  startedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => Turn, (turn) => turn.call)
  turns!: Turn[];
}
