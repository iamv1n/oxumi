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

// The top-level container: agents and their calls live inside a project.
@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  // The account this project belongs to. Rows without one are unreachable.
  @Index()
  @Column({ type: "uuid", nullable: true })
  ownerId!: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ownerId" })
  owner!: User;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
