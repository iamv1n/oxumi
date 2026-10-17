import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Call } from "./call.entity";

@Entity("turns")
@Index(["callId", "index"])
export class Turn {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  callId!: string;

  @ManyToOne(() => Call, (call) => call.turns, { onDelete: "CASCADE" })
  call!: Call;

  @Column({ type: "int" })
  index!: number;

  @Column({ type: "text", nullable: true })
  callerText!: string | null;

  @Column({ type: "text" })
  agentText!: string;

  @Column()
  interrupted!: boolean;

  @Column()
  nodeId!: string;

  // Milliseconds from the caller finishing to first LLM text / first audio.
  @Column({ type: "int", nullable: true })
  llmMs!: number | null;

  @Column({ type: "int", nullable: true })
  audioMs!: number | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
