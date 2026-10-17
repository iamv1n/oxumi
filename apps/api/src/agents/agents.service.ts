import {
  blankFlow,
  checkFlow,
  type DraftFlow,
  type Flow,
  type FlowIssue,
  type NodeLayout,
  slugify,
} from "@oxumi/flow-core";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FlowsService } from "../flows/flows.service";
import type { Role } from "../projects/access";
import { AuditService } from "../projects/audit.service";
import { ProjectsService, requireName } from "../projects/projects.service";
import { Agent } from "./agent.entity";

export interface AgentSummary {
  id: string;
  projectId: string;
  name: string;
  description: string;
  model: string;
  speech: string;
  telephony: string;
  phoneNumber: string;
  // Answers side questions from the project's knowledge base.
  knowledge: boolean;
  // True when the flow has no errors and the agent can take calls.
  ready: boolean;
  stepCount: number;
  updatedAt: Date;
}

export interface AgentDetail extends AgentSummary {
  flow: DraftFlow;
  layout: NodeLayout;
  issues: FlowIssue[];
  createdAt: Date;
}

interface AgentInput {
  name?: unknown;
  description?: unknown;
  model?: unknown;
  speech?: unknown;
  telephony?: unknown;
  phoneNumber?: unknown;
  knowledge?: unknown;
  flow?: unknown;
  layout?: unknown;
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent) private agents: Repository<Agent>,
    private projects: ProjectsService,
    private templates: FlowsService,
    private audit: AuditService,
  ) {}

  // The flow as it will run: named after the agent, then checked.
  check(agent: Agent): { flow: Flow | null; issues: FlowIssue[] } {
    return checkFlow({ ...agent.flow, id: slugify(agent.name), name: agent.name });
  }

  private summary(agent: Agent): AgentSummary {
    const { issues } = this.check(agent);
    return {
      id: agent.id,
      projectId: agent.projectId,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      speech: agent.speech,
      telephony: agent.telephony,
      phoneNumber: agent.phoneNumber,
      knowledge: agent.knowledge,
      ready: !issues.some((issue) => issue.level === "error"),
      stepCount: Array.isArray(agent.flow?.nodes) ? agent.flow.nodes.length : 0,
      updatedAt: agent.updatedAt,
    };
  }

  private detail(agent: Agent): AgentDetail {
    return {
      ...this.summary(agent),
      flow: agent.flow,
      layout: agent.layout,
      issues: this.check(agent).issues,
      createdAt: agent.createdAt,
    };
  }

  // No ownership check: for server-side use on a call already authorised.
  async load(id: string): Promise<Agent> {
    const agent = await this.agents.findOneBy({ id });
    if (!agent) throw new NotFoundException("Agent not found.");
    return agent;
  }

  // Loads an agent the user may act on; an agent outside their projects
  // reads as missing, and one they may only view says so when they need more.
  async find(id: string, userId: string, need: Role = "viewer"): Promise<Agent> {
    const agent = await this.agents.findOneBy({ id });
    if (!agent) throw new NotFoundException("Agent not found.");
    await this.projects.get(agent.projectId, userId, need).catch((err: unknown) => {
      throw err instanceof NotFoundException ? new NotFoundException("Agent not found.") : err;
    });
    return agent;
  }

  async list(projectId: string, userId: string): Promise<AgentSummary[]> {
    await this.projects.get(projectId, userId);
    const agents = await this.agents.find({
      where: { projectId },
      order: { updatedAt: "DESC" },
    });
    return agents.map((agent) => this.summary(agent));
  }

  async get(id: string, userId: string): Promise<AgentDetail> {
    return this.detail(await this.find(id, userId));
  }

  async create(
    projectId: string,
    userId: string,
    input: AgentInput & { templateId?: unknown },
  ): Promise<AgentDetail> {
    await this.projects.get(projectId, userId, "editor");
    const name = requireName(input.name);
    const template =
      typeof input.templateId === "string" && input.templateId
        ? this.templates.get(input.templateId).flow
        : null;
    const agent = this.agents.create({
      projectId,
      name,
      description:
        typeof input.description === "string" && input.description
          ? input.description
          : (template?.description ?? ""),
      model: typeof input.model === "string" ? input.model : "",
      flow: template ? structuredClone(template) : blankFlow(name),
      layout: {},
    });
    const saved = await this.agents.save(agent);
    await this.audit.recordBy(projectId, userId, "agent.created", saved.name, {
      agentId: saved.id,
      template: typeof input.templateId === "string" ? input.templateId : null,
    });
    return this.detail(saved);
  }

  async update(
    id: string,
    userId: string,
    input: AgentInput,
  ): Promise<AgentDetail> {
    const agent = await this.find(id, userId, "editor");
    const changed = Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined);
    if (input.name !== undefined) agent.name = requireName(input.name);
    if (typeof input.description === "string") agent.description = input.description;
    if (typeof input.model === "string") agent.model = input.model;
    if (typeof input.speech === "string") agent.speech = input.speech;
    if (typeof input.telephony === "string") {
      if (!["", "twilio", "exotel", "vobiz"].includes(input.telephony))
        throw new BadRequestException('telephony must be "twilio", "exotel", "vobiz" or empty.');
      agent.telephony = input.telephony;
    }
    if (typeof input.phoneNumber === "string") {
      const number = input.phoneNumber.replace(/[\s()-]/g, "");
      if (number && !/^\+?\d{6,15}$/.test(number))
        throw new BadRequestException("The calling number must be digits, optionally starting with +.");
      agent.phoneNumber = number;
    }
    if (typeof input.knowledge === "boolean") agent.knowledge = input.knowledge;
    if (input.flow !== undefined) {
      if (!isRecord(input.flow) || !Array.isArray(input.flow.nodes))
        throw new BadRequestException("flow must be an object with a nodes array.");
      agent.flow = input.flow as unknown as DraftFlow;
    }
    if (input.layout !== undefined) {
      if (!isRecord(input.layout))
        throw new BadRequestException("layout must be an object.");
      agent.layout = input.layout as NodeLayout;
    }
    const saved = await this.agents.save(agent);
    // Moving nodes on the canvas is not worth a log line.
    const meaningful = changed.filter((key) => key !== "layout");
    if (meaningful.length)
      await this.audit.recordBy(saved.projectId, userId, "agent.updated", saved.name, {
        agentId: saved.id,
        changed: meaningful,
      });
    return this.detail(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const agent = await this.find(id, userId, "editor");
    const { projectId, name } = agent;
    await this.agents.remove(agent);
    await this.audit.recordBy(projectId, userId, "agent.deleted", name, { agentId: id });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
