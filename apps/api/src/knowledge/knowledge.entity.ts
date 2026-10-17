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

export type SourceKind = "text" | "url";

// Something an agent can answer side questions from: pasted text, an
// uploaded text file, or a web page.
@Entity("knowledge_sources")
export class KnowledgeSource {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column()
  title!: string;

  @Column({ type: "varchar" })
  kind!: SourceKind;

  // For a web page: where it was fetched from.
  @Column({ type: "text", nullable: true })
  url!: string | null;

  // ready, or failed with the reason in `error`.
  @Column({ type: "varchar", default: "ready" })
  status!: "ready" | "failed";

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @Column({ type: "int", default: 0 })
  characters!: number;

  @Column({ type: "int", default: 0 })
  chunks!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

// A passage of a source, sized to be handed to the model whole. Searched
// with Postgres full-text search on `search`, which the database keeps up
// to date from `content`.
@Entity("knowledge_chunks")
export class KnowledgeChunk {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  sourceId!: string;

  @ManyToOne(() => KnowledgeSource, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sourceId" })
  source!: KnowledgeSource;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "int" })
  position!: number;

  @Column({ type: "text" })
  content!: string;

  // "simple" keeps every word as written, so Hindi and English both match.
  @Column({
    type: "tsvector",
    generatedType: "STORED",
    asExpression: `to_tsvector('simple', "content")`,
    select: false,
    insert: false,
    update: false,
  })
  search!: string;
}
