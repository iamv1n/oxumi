import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

// One signed-in browser. The cookie holds a random token; only its SHA-256 is
// stored, so a leaked database cannot be replayed as live sessions.
@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  tokenHash!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  // Set when an admin opened this session to act as the user. Such sessions
  // are short-lived and cannot change the user's sign-in details.
  @Column({ type: "uuid", nullable: true })
  impersonatorId!: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "impersonatorId" })
  impersonator!: User | null;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
