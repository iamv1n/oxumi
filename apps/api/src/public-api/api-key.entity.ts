import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Project } from "../projects/project.entity";

// A credential other software uses to act on one project. The secret is
// shown once when created; only its SHA-256 is stored.
@Entity("api_keys")
export class ApiKey {
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

  // The first characters of the secret, kept so a key can be recognised.
  @Column()
  prefix!: string;

  @Index({ unique: true })
  @Column({ select: false })
  keyHash!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt!: Date | null;

  // Set by an expiry chosen at creation, or by rotation (the old key keeps
  // working for a grace period so integrations can switch over).
  @Column({ type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  // The key that replaced this one, when it was rotated.
  @Column({ type: "uuid", nullable: true })
  rotatedToId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
