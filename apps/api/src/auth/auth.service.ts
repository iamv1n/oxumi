import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { In, IsNull, MoreThan, Not, Repository } from "typeorm";
import { AppConfig } from "../config";
import { MailService } from "./mail.service";
import { PasswordReset } from "./password-reset.entity";
import { Session } from "./session.entity";
import { User, type UserRole } from "./user.entity";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  company: string;
  role: UserRole;
  createdAt: Date;
  // The admin acting as this user, when the session is an impersonation.
  impersonator: { id: string; name: string; email: string } | null;
}

export const SESSION_COOKIE = "cf_session";
// While an admin acts as someone else, their own session waits here so
// "Return to admin" can restore it without signing in again.
export const ADMIN_SESSION_COOKIE = "cf_admin_session";
export const IMPERSONATION_TTL_MS = 60 * 60 * 1000;
// "Keep me signed in" lasts a month; otherwise the session ends with the
// browser, and is discarded server-side after a day regardless.
export const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const BROWSER_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private logger = new Logger(AuthService.name);
  // Failed sign-ins per address and email. In memory: enough for one node,
  // and it resets on restart rather than locking anyone out for good.
  private failures = new Map<string, { count: number; since: number }>();
  // Compared against when the email is unknown, so timing does not reveal
  // whether an account exists.
  private decoyHash = hashPassword(randomBytes(16).toString("hex"));

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Session) private sessions: Repository<Session>,
    @InjectRepository(PasswordReset) private resets: Repository<PasswordReset>,
    private mail: MailService,
    private config: AppConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const emails = this.config.adminEmails;
    if (!emails.length) return;
    const { affected } = await this.users.update(
      { email: In(emails), role: Not("admin") },
      { role: "admin" },
    );
    if (affected) this.logger.log(`Made ${affected} account(s) admin from ADMIN_EMAILS.`);
  }

  async signup(input: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    company?: unknown;
    acceptTerms?: unknown;
  }): Promise<AuthUser> {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const company =
      typeof input.company === "string" ? input.company.trim().slice(0, 120) : "";
    const email = normaliseEmail(input.email);
    const password = typeof input.password === "string" ? input.password : "";
    if (!name) throw new BadRequestException("Enter your name.");
    if (name.length > 80) throw new BadRequestException("That name is too long.");
    if (!EMAIL_RE.test(email)) throw new BadRequestException("Enter a valid email address.");
    assertPassword(password);
    if (input.acceptTerms !== true)
      throw new BadRequestException(
        "Please accept the Terms of Service and Privacy Policy to continue.",
      );

    if (await this.users.existsBy({ email }))
      throw new ConflictException("An account with this email already exists.");
    const user = await this.users.save(
      this.users.create({
        name,
        email,
        company,
        acceptedTermsAt: new Date(),
        lastLoginAt: new Date(),
        role: this.config.adminEmails.includes(email) ? "admin" : "user",
        passwordHash: await hashPassword(password),
      }),
    );
    return publicUser(user);
  }

  async login(
    input: { email?: unknown; password?: unknown },
    address: string,
  ): Promise<AuthUser> {
    const email = normaliseEmail(input.email);
    const password = typeof input.password === "string" ? input.password : "";
    const key = `${address}|${email}`;
    this.assertNotThrottled(key);

    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne();
    const ok = await verifyPassword(
      password.slice(0, MAX_PASSWORD),
      user?.passwordHash ?? (await this.decoyHash),
    );
    if (!user || !ok) {
      this.recordFailure(key);
      throw new UnauthorizedException("Email or password is incorrect.");
    }
    this.failures.delete(key);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    return publicUser(user);
  }

  // Returns the token for the cookie. It is not recoverable afterwards.
  async createSession(
    userId: string,
    ttlMs: number,
    impersonatorId: string | null = null,
  ): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.sessions.save(
      this.sessions.create({
        userId,
        impersonatorId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      }),
    );
    return token;
  }

  async userForToken(token: string | undefined): Promise<AuthUser | null> {
    return (await this.sessionForToken(token))?.user ?? null;
  }

  // The user behind a cookie, and when that session lapses.
  async sessionForToken(
    token: string | undefined,
  ): Promise<{ user: AuthUser; expiresAt: Date } | null> {
    if (!token) return null;
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token), expiresAt: MoreThan(new Date()) },
      relations: { user: true, impersonator: true },
    });
    return session
      ? { user: publicUser(session.user, session.impersonator), expiresAt: session.expiresAt }
      : null;
  }

  // Opens a short session as `target` on behalf of `admin`. Admins cannot be
  // impersonated, so an impersonation can never reach the admin console.
  async impersonate(admin: AuthUser, targetId: string): Promise<string> {
    if (admin.role !== "admin" || admin.impersonator)
      throw new UnauthorizedException("Only admins can do this.");
    if (targetId === admin.id)
      throw new BadRequestException("You are already signed in as yourself.");
    const target = await this.users.findOneBy({ id: targetId });
    if (!target) throw new BadRequestException("That account no longer exists.");
    if (target.role === "admin")
      throw new BadRequestException("Admins can't be impersonated.");
    this.logger.warn(`Admin ${admin.email} (${admin.id}) signed in as ${target.email} (${target.id}).`);
    return this.createSession(target.id, IMPERSONATION_TTL_MS, admin.id);
  }

  async endSession(token: string | undefined): Promise<void> {
    if (token) await this.sessions.delete({ tokenHash: hashToken(token) });
  }

  private async withPassword(userId: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :userId", { userId })
      .getOneOrFail();
    return user;
  }

  // Sensitive changes re-ask for the password, so a session left open on a
  // shared machine is not enough to take over the account.
  private async confirmPassword(userId: string, password: unknown): Promise<User> {
    const user = await this.withPassword(userId);
    const given = typeof password === "string" ? password.slice(0, MAX_PASSWORD) : "";
    if (!given || !(await verifyPassword(given, user.passwordHash)))
      throw new BadRequestException("Your current password is incorrect.");
    return user;
  }

  async updateProfile(
    userId: string,
    input: { name?: unknown; company?: unknown; email?: unknown; currentPassword?: unknown },
  ): Promise<AuthUser> {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (input.name !== undefined) {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (!name) throw new BadRequestException("Enter your name.");
      if (name.length > 80) throw new BadRequestException("That name is too long.");
      user.name = name;
    }
    if (typeof input.company === "string")
      user.company = input.company.trim().slice(0, 120);
    if (input.email !== undefined) {
      const email = normaliseEmail(input.email);
      if (email !== user.email) {
        if (!EMAIL_RE.test(email))
          throw new BadRequestException("Enter a valid email address.");
        await this.confirmPassword(userId, input.currentPassword);
        if (await this.users.existsBy({ email }))
          throw new ConflictException("An account with this email already exists.");
        user.email = email;
      }
    }
    return publicUser(await this.users.save(user));
  }

  // Signs out every other browser; the one making the change stays signed in.
  async changePassword(
    userId: string,
    input: { currentPassword?: unknown; newPassword?: unknown },
    currentToken: string | undefined,
  ): Promise<void> {
    await this.confirmPassword(userId, input.currentPassword);
    const next = typeof input.newPassword === "string" ? input.newPassword : "";
    assertPassword(next);
    await this.users.update(userId, { passwordHash: await hashPassword(next) });
    const keep = currentToken ? hashToken(currentToken) : "";
    await this.sessions
      .createQueryBuilder()
      .delete()
      .where('"userId" = :userId AND "tokenHash" <> :keep', { userId, keep })
      .execute();
  }

  // Permanent: the account's projects, agents, calls and keys go with it.
  async deleteAccount(userId: string, password: unknown): Promise<void> {
    await this.confirmPassword(userId, password);
    await this.users.delete(userId);
  }

  // Always succeeds from the caller's point of view, so the response never
  // reveals whether an address has an account.
  async requestPasswordReset(rawEmail: unknown): Promise<void> {
    const user = await this.users.findOneBy({ email: normaliseEmail(rawEmail) });
    if (!user) return;
    const recent = await this.resets.existsBy({
      userId: user.id,
      createdAt: MoreThan(new Date(Date.now() - RESET_COOLDOWN_MS)),
    });
    if (recent) return;

    const token = randomBytes(32).toString("base64url");
    await this.resets.save(
      this.resets.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        usedAt: null,
      }),
    );
    const link = `${this.config.webOrigin}/reset-password?token=${token}`;
    await this.mail.send({
      to: user.email,
      subject: "Reset your Oxumi password",
      text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in one hour.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password has not changed.`,
    });
  }

  async resetPassword(input: { token?: unknown; password?: unknown }): Promise<void> {
    const token = typeof input.token === "string" ? input.token : "";
    const password = typeof input.password === "string" ? input.password : "";
    assertPassword(password);
    const reset = token
      ? await this.resets.findOneBy({
          tokenHash: hashToken(token),
          usedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        })
      : null;
    if (!reset)
      throw new BadRequestException(
        "This reset link is invalid or has expired. Request a new one.",
      );

    await this.users.update(reset.userId, {
      passwordHash: await hashPassword(password),
    });
    await this.resets.update(reset.id, { usedAt: new Date() });
    // Anyone holding an old session, including an attacker, is signed out.
    await this.sessions.delete({ userId: reset.userId });
  }

  private assertNotThrottled(key: string): void {
    const entry = this.failures.get(key);
    if (!entry) return;
    if (Date.now() - entry.since > FAILURE_WINDOW_MS) {
      this.failures.delete(key);
    } else if (entry.count >= MAX_FAILURES) {
      throw new HttpException(
        "Too many attempts. Try again in a few minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string): void {
    const entry = this.failures.get(key);
    if (entry) entry.count++;
    else this.failures.set(key, { count: 1, since: Date.now() });
  }
}

function assertPassword(password: string): void {
  if (password.length < MIN_PASSWORD)
    throw new BadRequestException(
      `Use at least ${MIN_PASSWORD} characters for the password.`,
    );
  if (password.length > MAX_PASSWORD)
    throw new BadRequestException("That password is too long.");
}

function normaliseEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function publicUser(user: User, impersonator: User | null = null): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    role: user.role,
    createdAt: user.createdAt,
    impersonator: impersonator
      ? { id: impersonator.id, name: impersonator.name, email: impersonator.email }
      : null,
  };
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name)
      return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}
