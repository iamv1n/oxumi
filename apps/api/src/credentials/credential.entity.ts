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

// A project's own key for an outside provider (a language model or a speech
// service). The secret is stored encrypted and never leaves the server.
@Entity("provider_credentials")
@Index(["projectId", "provider"], { unique: true })
export class ProviderCredential {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // A provider id from the catalog in credentials.service.ts.
  @Column()
  provider!: string;

  @Column({ type: "text", select: false })
  sealedSecret!: string;

  // The last four characters, so the owner can recognise which key is saved.
  @Column()
  hint!: string;

  // Non-secret options, e.g. a default voice for a speech provider.
  @Column({ type: "jsonb", default: {} })
  options!: Record<string, string>;

  // Result of the most recent "Test" against the provider.
  @Column({ type: "timestamptz", nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  verifyError!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
