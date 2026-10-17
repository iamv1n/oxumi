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

export const WEBHOOK_EVENTS = ["call.completed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// A URL in the customer's own system that is told when things happen.
@Entity("webhook_endpoints")
export class WebhookEndpoint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "text" })
  url!: string;

  // Signs every delivery. Shown once at creation; stored encrypted because,
  // unlike a password, it has to be read back to compute signatures.
  @Column({ type: "text", select: false })
  sealedSecret!: string;

  @Column({ type: "jsonb" })
  events!: WebhookEvent[];

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

export type DeliveryStatus = "pending" | "delivered" | "failed";

// One attempt-tracked message to one endpoint.
@Entity("webhook_deliveries")
@Index(["status", "nextAttemptAt"])
export class WebhookDelivery {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  endpointId!: string;

  @ManyToOne(() => WebhookEndpoint, { onDelete: "CASCADE" })
  @JoinColumn({ name: "endpointId" })
  endpoint!: WebhookEndpoint;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column()
  event!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ type: "varchar", default: "pending" })
  status!: DeliveryStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "timestamptz", nullable: true })
  nextAttemptAt!: Date | null;

  // HTTP status of the latest attempt, when the endpoint answered at all.
  @Column({ type: "int", nullable: true })
  lastStatus!: number | null;

  @Column({ type: "text", nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  deliveredAt!: Date | null;
}
