import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

// One row per request to the public API. Nothing from the request or
// response body is stored.
@Entity("api_usage")
@Index(["projectId", "createdAt"])
export class ApiUsage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  projectId!: string;

  @Index()
  @Column({ type: "uuid" })
  apiKeyId!: string;

  @Column()
  method!: string;

  // The route pattern ("/v1/calls/:id"), not the concrete URL.
  @Column()
  route!: string;

  @Column({ type: "int" })
  status!: number;

  @Column({ type: "int" })
  durationMs!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
