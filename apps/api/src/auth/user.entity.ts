import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

// "admin" opens the operator console (/admin): every account, its projects
// and usage, and signing in as a user. Granted by ADMIN_EMAILS or by another
// admin; unrelated to the per-project roles in projects/access.ts.
export type UserRole = "user" | "admin";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Stored lower-cased; uniqueness is case-insensitive as a result.
  @Index({ unique: true })
  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ default: "" })
  company!: string;

  // When the person agreed to the terms and privacy policy at signup.
  @Column({ type: "timestamptz", nullable: true })
  acceptedTermsAt!: Date | null;

  // scrypt, self-describing: "scrypt$<salt>$<hash>". Never returned by the API.
  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: "varchar", default: "user" })
  role!: UserRole;

  // Last password sign-in or signup. Not touched by sessions an admin opens
  // as this user.
  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
