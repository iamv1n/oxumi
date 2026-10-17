import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../auth/user.entity";
import type { AssignableRole } from "./access";
import { Project } from "./project.entity";

// Someone other than the owner who can work in a project.
@Entity("project_members")
@Index(["projectId", "userId"], { unique: true })
export class ProjectMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "varchar" })
  role!: AssignableRole;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

// An invitation sent by email. The link carries a token; only its hash is kept.
@Entity("project_invites")
export class ProjectInvite {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // Stored lower-cased.
  @Column()
  email!: string;

  @Column({ type: "varchar" })
  role!: AssignableRole;

  @Index({ unique: true })
  @Column({ select: false })
  tokenHash!: string;

  @Column({ type: "uuid", nullable: true })
  invitedById!: string | null;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
