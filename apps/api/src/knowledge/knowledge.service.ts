import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { type Actor, AuditService } from "../projects/audit.service";
import { ProjectsService, requireName } from "../projects/projects.service";
import { assertSafeUrl } from "../webhooks/safe-url";
import { KnowledgeChunk, KnowledgeSource } from "./knowledge.entity";
import { chunkText, htmlToText, searchTerms } from "./text";

const MAX_SOURCES = 50;
const MAX_CHARACTERS = 200_000;
const PASSAGES = 3;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 2_000_000;

export interface SourceView {
  id: string;
  title: string;
  kind: KnowledgeSource["kind"];
  url: string | null;
  status: KnowledgeSource["status"];
  error: string | null;
  characters: number;
  chunks: number;
  createdAt: Date;
  updatedAt: Date;
}

const view = (s: KnowledgeSource): SourceView => ({
  id: s.id,
  title: s.title,
  kind: s.kind,
  url: s.url,
  status: s.status,
  error: s.error,
  characters: s.characters,
  chunks: s.chunks,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

@Injectable()
export class KnowledgeService implements OnModuleInit {
  constructor(
    @InjectRepository(KnowledgeSource) private sources: Repository<KnowledgeSource>,
    @InjectRepository(KnowledgeChunk) private chunks: Repository<KnowledgeChunk>,
    @InjectDataSource() private db: DataSource,
    private projects: ProjectsService,
    private audit: AuditService,
  ) {}

  // The search index is not something an entity can declare.
  async onModuleInit(): Promise<void> {
    await this.db
      .query(`CREATE INDEX IF NOT EXISTS knowledge_chunks_search ON knowledge_chunks USING GIN (search)`)
      .catch(() => undefined);
  }

  async list(projectId: string, userId: string): Promise<SourceView[]> {
    await this.projects.get(projectId, userId);
    const rows = await this.sources.find({ where: { projectId }, order: { createdAt: "DESC" } });
    return rows.map(view);
  }

  async add(
    projectId: string,
    actor: Actor & { id: string },
    input: { title?: unknown; text?: unknown; url?: unknown },
  ): Promise<SourceView> {
    await this.projects.get(projectId, actor.id, "editor");
    if ((await this.sources.countBy({ projectId })) >= MAX_SOURCES)
      throw new BadRequestException(`A project can have at most ${MAX_SOURCES} knowledge sources.`);

    let source: KnowledgeSource;
    if (typeof input.url === "string" && input.url.trim()) {
      const url = input.url.trim();
      source = this.sources.create({
        projectId,
        kind: "url",
        url,
        title: typeof input.title === "string" && input.title.trim() ? requireName(input.title) : url,
      });
      source = await this.sources.save(source);
      await this.refetch(source, typeof input.title === "string" && input.title.trim() !== "");
    } else {
      const text = typeof input.text === "string" ? input.text : "";
      if (!chunkText(text).length) throw new BadRequestException("Paste some text, or give a page address.");
      source = await this.sources.save(
        this.sources.create({ projectId, kind: "text", url: null, title: requireName(input.title) }),
      );
      await this.store(source, text);
    }
    await this.audit.record(projectId, actor, "knowledge.added", source.title, {
      kind: source.kind,
      url: source.url,
    });
    return view((await this.sources.findOneBy({ id: source.id }))!);
  }

  // Fetches a web source again, replacing its passages.
  async refresh(projectId: string, actor: Actor & { id: string }, id: string): Promise<SourceView> {
    await this.projects.get(projectId, actor.id, "editor");
    const source = await this.sources.findOneBy({ id, projectId });
    if (!source) throw new NotFoundException("Source not found.");
    if (source.kind !== "url") throw new BadRequestException("Only web pages can be fetched again.");
    await this.refetch(source, true);
    await this.audit.record(projectId, actor, "knowledge.refreshed", source.title);
    return view((await this.sources.findOneBy({ id }))!);
  }

  async remove(projectId: string, actor: Actor & { id: string }, id: string): Promise<void> {
    await this.projects.get(projectId, actor.id, "editor");
    const source = await this.sources.findOneBy({ id, projectId });
    if (!source) return;
    await this.sources.remove(source);
    await this.audit.record(projectId, actor, "knowledge.removed", source.title);
  }

  // The passages an agent would be given for a question, to try it out.
  async search(projectId: string, userId: string, question: unknown) {
    await this.projects.get(projectId, userId);
    const text = typeof question === "string" ? question.slice(0, 500) : "";
    if (!text.trim()) throw new BadRequestException("Ask a question to search for.");
    return this.find(projectId, text);
  }

  async hasSources(projectId: string): Promise<boolean> {
    return this.sources.existsBy({ projectId, status: "ready" });
  }

  // For the runtime: the best passages for what the caller said.
  async lookup(projectId: string, question: string): Promise<string[]> {
    return (await this.find(projectId, question)).map((hit) => hit.content);
  }

  private async find(
    projectId: string,
    question: string,
  ): Promise<{ sourceId: string; title: string; content: string; rank: number }[]> {
    const terms = searchTerms(question);
    if (!terms.length) return [];
    const query = terms.map((t) => t.replace(/'/g, "''")).map((t) => `'${t}'`).join(" | ");
    return this.db.query(
      `SELECT c."sourceId", s.title, c.content, ts_rank(c.search, q) AS rank
         FROM knowledge_chunks c
         JOIN knowledge_sources s ON s.id = c."sourceId",
              to_tsquery('simple', $2) q
        WHERE c."projectId" = $1 AND c.search @@ q
        ORDER BY rank DESC
        LIMIT ${PASSAGES}`,
      [projectId, query],
    );
  }

  private async refetch(source: KnowledgeSource, keepTitle: boolean): Promise<void> {
    try {
      const { title, text } = await fetchPage(source.url!);
      if (!keepTitle && title) source.title = title.slice(0, 80);
      await this.sources.save(source);
      await this.store(source, text);
    } catch (err) {
      source.status = "failed";
      source.error = err instanceof Error ? err.message : "The page could not be read.";
      await this.sources.save(source);
    }
  }

  private async store(source: KnowledgeSource, raw: string): Promise<void> {
    const text = raw.slice(0, MAX_CHARACTERS);
    const passages = chunkText(text);
    if (!passages.length) throw new BadRequestException("There is no readable text in this source.");
    await this.db.transaction(async (tx) => {
      await tx.delete(KnowledgeChunk, { sourceId: source.id });
      await tx.insert(
        KnowledgeChunk,
        passages.map((content, position) => ({
          sourceId: source.id,
          projectId: source.projectId,
          position,
          content,
        })),
      );
      await tx.update(KnowledgeSource, source.id, {
        status: "ready",
        error: null,
        characters: text.length,
        chunks: passages.length,
      });
    });
  }
}

// Fetches a public page, following a few redirects and checking each hop
// is a public address.
async function fetchPage(raw: string): Promise<{ title: string; text: string }> {
  let address = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertSafeUrl(address).catch((err: Error) => {
      throw new BadRequestException(err.message.replace("Webhook URLs", "Page addresses"));
    });
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Oxumi-Knowledge/1", Accept: "text/html,text/plain;q=0.9" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }).catch(() => {
      throw new BadRequestException("The page could not be reached.");
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      address = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) throw new BadRequestException(`The page answered with HTTP ${res.status}.`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)|application\/xhtml/.test(type))
      throw new BadRequestException("Only web pages and plain text can be read; PDFs and other files are not supported yet.");
    const body = (await res.text()).slice(0, MAX_BYTES);
    return type.includes("text/plain") ? { title: "", text: body } : htmlToText(body);
  }
  throw new BadRequestException("The page redirects too many times.");
}
