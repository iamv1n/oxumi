import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "node:crypto";
import { MoreThan, Repository } from "typeorm";
import type { AuthUser } from "../auth/auth.service";
import { MailService } from "../auth/mail.service";
import { User } from "../auth/user.entity";
import { AppConfig } from "../config";
import { isAssignableRole, type Role } from "./access";
import { actorOf, AuditService } from "./audit.service";
import { ProjectInvite, ProjectMember } from "./member.entity";
import { ProjectsService } from "./projects.service";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface MemberView {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: Date;
}

export interface InviteView {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
  createdAt: Date;
}

// Who works in a project, and the invitations that bring more people in.
@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    @InjectRepository(ProjectInvite) private invites: Repository<ProjectInvite>,
    @InjectRepository(User) private users: Repository<User>,
    private projects: ProjectsService,
    private audit: AuditService,
    private mail: MailService,
    private config: AppConfig,
  ) {}

  // The owner first, then everyone else by when they joined.
  async list(projectId: string, userId: string): Promise<MemberView[]> {
    const project = await this.projects.get(projectId, userId);
    const owner = project.ownerId ? await this.users.findOneBy({ id: project.ownerId }) : null;
    const rows = await this.members.find({
      where: { projectId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
    return [
      ...(owner
        ? [{ userId: owner.id, name: owner.name, email: owner.email, role: "owner" as const, joinedAt: project.createdAt }]
        : []),
      ...rows.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        role: row.role,
        joinedAt: row.createdAt,
      })),
    ];
  }

  async pending(projectId: string, userId: string): Promise<InviteView[]> {
    await this.projects.get(projectId, userId, "admin");
    const rows = await this.invites.find({
      where: { projectId, expiresAt: MoreThan(new Date()) },
      order: { createdAt: "DESC" },
    });
    return rows.map(({ id, email, role, expiresAt, createdAt }) => ({
      id,
      email,
      role,
      expiresAt,
      createdAt,
    }));
  }

  async invite(
    projectId: string,
    user: AuthUser,
    input: { email?: unknown; role?: unknown },
  ): Promise<InviteView> {
    const project = await this.projects.get(projectId, user.id, "admin");
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (!EMAIL.test(email)) throw new BadRequestException("Enter a valid email address.");
    if (!isAssignableRole(input.role))
      throw new BadRequestException('role must be "viewer", "editor" or "admin".');
    // Only the owner can make someone an admin.
    if (input.role === "admin" && project.role !== "owner")
      throw new ForbiddenException("Only the owner can invite an admin.");

    const existing = await this.users.findOneBy({ email });
    if (existing && (existing.id === project.ownerId || (await this.members.existsBy({ projectId, userId: existing.id }))))
      throw new ConflictException(`${email} is already in this project.`);

    // A new invitation to the same address replaces the old one.
    await this.invites.delete({ projectId, email });
    const token = randomBytes(32).toString("base64url");
    const invite = await this.invites.save(
      this.invites.create({
        projectId,
        email,
        role: input.role,
        tokenHash: hash(token),
        invitedById: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      }),
    );
    const link = `${this.config.webOrigin.replace(/\/$/, "")}/invite?token=${token}`;
    await this.mail.send({
      to: email,
      subject: `${user.name || user.email} invited you to ${project.name} on Oxumi`,
      text: [
        `${user.name || user.email} has invited you to work on "${project.name}" as ${input.role === "admin" ? "an admin" : `an ${input.role === "editor" ? "editor" : "viewer"}`}.`,
        "",
        `Accept the invitation: ${link}`,
        "",
        "The link works for 7 days. Sign in, or create an account, with this email address to accept it.",
      ].join("\n"),
    });
    await this.audit.record(projectId, actorOf(user), "member.invited", email, { role: input.role });
    return {
      id: invite.id,
      email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  async revokeInvite(projectId: string, user: AuthUser, inviteId: string): Promise<void> {
    await this.projects.get(projectId, user.id, "admin");
    const invite = await this.invites.findOneBy({ id: inviteId, projectId });
    if (!invite) return;
    await this.invites.remove(invite);
    await this.audit.record(projectId, actorOf(user), "member.invite_revoked", invite.email);
  }

  async setRole(
    projectId: string,
    user: AuthUser,
    memberId: string,
    role: unknown,
  ): Promise<MemberView> {
    const project = await this.projects.get(projectId, user.id, "admin");
    if (!isAssignableRole(role))
      throw new BadRequestException('role must be "viewer", "editor" or "admin".');
    const member = await this.members.findOne({
      where: { projectId, userId: memberId },
      relations: { user: true },
    });
    if (!member) throw new NotFoundException("That person is not a member of this project.");
    // Admins manage editors and viewers; only the owner manages admins.
    if ((member.role === "admin" || role === "admin") && project.role !== "owner")
      throw new ForbiddenException("Only the owner can make or change an admin.");
    const before = member.role;
    member.role = role;
    await this.members.save(member);
    await this.audit.record(projectId, actorOf(user), "member.role_changed", member.user.email, {
      before,
      after: role,
    });
    return {
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role,
      joinedAt: member.createdAt,
    };
  }

  // Removes someone, or lets a member leave when they remove themselves.
  async remove(projectId: string, user: AuthUser, memberId: string): Promise<void> {
    const leaving = memberId === user.id;
    const project = await this.projects.get(projectId, user.id, leaving ? "viewer" : "admin");
    if (memberId === project.ownerId)
      throw new BadRequestException("The owner cannot be removed from their own project.");
    const member = await this.members.findOne({
      where: { projectId, userId: memberId },
      relations: { user: true },
    });
    if (!member) return;
    if (!leaving && member.role === "admin" && project.role !== "owner")
      throw new ForbiddenException("Only the owner can remove an admin.");
    await this.members.remove(member);
    await this.audit.record(
      projectId,
      actorOf(user),
      leaving ? "member.left" : "member.removed",
      member.user.email,
      { role: member.role },
    );
  }

  // What an invitation link is for, so the page can say so before sign-in.
  async preview(token: string): Promise<{ projectName: string; email: string; role: Role }> {
    const invite = await this.findInvite(token);
    return { projectName: invite.project.name, email: invite.email, role: invite.role };
  }

  async accept(token: string, user: AuthUser): Promise<{ projectId: string }> {
    const invite = await this.findInvite(token);
    if (invite.email !== user.email.toLowerCase())
      throw new ForbiddenException(
        `This invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
      );
    const projectId = invite.projectId;
    const already =
      invite.project.ownerId === user.id ||
      (await this.members.existsBy({ projectId, userId: user.id }));
    if (!already) {
      await this.members.save(this.members.create({ projectId, userId: user.id, role: invite.role }));
      await this.audit.record(projectId, actorOf(user), "member.joined", user.email, {
        role: invite.role,
      });
    }
    await this.invites.delete({ id: invite.id });
    return { projectId };
  }

  private async findInvite(token: string): Promise<ProjectInvite> {
    const invite = token
      ? await this.invites.findOne({
          where: { tokenHash: hash(token) },
          relations: { project: true },
        })
      : null;
    if (!invite) throw new NotFoundException("This invitation is not valid. Ask for a new one.");
    if (+invite.expiresAt < Date.now()) throw new GoneException("This invitation has expired. Ask for a new one.");
    return invite;
  }
}
