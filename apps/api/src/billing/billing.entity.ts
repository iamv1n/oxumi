import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Project } from "../projects/project.entity";

// A project's spending limit for a calendar month (UTC).
@Entity("billing_settings")
export class BillingSettings {
  @PrimaryColumn("uuid")
  projectId!: string;

  @OneToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  // In the billing currency. Null means no limit.
  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true })
  monthlyCap!: string | null;

  // Admins are emailed once a month when spend passes this share of the cap.
  @Column({ type: "int", default: 80 })
  alertPercent!: number;

  // "YYYY-MM" of the month the alert was last sent, so it is sent once.
  @Column({ type: "varchar", default: "" })
  alertedMonth!: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
