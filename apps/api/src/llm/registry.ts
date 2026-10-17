import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { z } from "zod";
import { AppConfig } from "../config";
import {
  CredentialsService,
  providerSpec,
  type ResolvedCredential,
} from "../credentials/credentials.service";
import { fingerprint } from "../credentials/vault";
import { AnthropicProvider } from "./anthropic";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

// Shape of models.config.json: which language-model providers exist and what
// each offers. Keys are NOT configured here; each project connects its own
// under Integrations (the server's environment is only a fallback).
const ProviderSchema = z.object({
  // Must match a provider id in credentials.service.ts.
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  type: z.enum(["anthropic", "openai-compatible"]),
  baseURL: z.string().url().optional(),
  // An explicit list, or "auto" to ask the provider what the key can use.
  models: z.union([
    z.literal("auto"),
    z.array(z.object({ id: z.string().min(1), label: z.string().optional() })),
  ]),
  // With "auto": only model ids matching this pattern are offered.
  autoFilter: z.string().optional(),
});
const ModelsConfigSchema = z.object({
  default: z.string().optional(),
  providers: z.array(ProviderSchema).min(1),
});
type ProviderConfig = z.infer<typeof ProviderSchema>;

export interface ModelOption {
  // "<provider>:<model>", the value a call is started with.
  ref: string;
  label: string;
}

export interface ProviderInfo {
  id: string;
  label: string;
  available: boolean;
  // Whose key makes it available: the project's own or the server's.
  source: "project" | "platform" | null;
  // Why nothing is selectable, when that is the case.
  note?: string;
  models: ModelOption[];
}

// Model families that cannot hold a text conversation with tools.
const NOT_CHAT =
  /embed|whisper|tts|audio|realtime|image|dall-e|moderation|transcribe|search|veo|imagen|aqa|robotics|computer-use/i;
const MODEL_LIST_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class LlmRegistry implements OnModuleInit {
  private logger = new Logger(LlmRegistry.name);
  private configs: ProviderConfig[] = [];
  private configuredDefault?: string;
  // Clients, per model and key. Model lists, per provider and key.
  private instances = new Map<string, LlmProvider>();
  private modelLists = new Map<string, { at: number; models: ModelOption[]; note?: string }>();

  constructor(
    private config: AppConfig,
    private credentials: CredentialsService,
  ) {}

  onModuleInit(): void {
    const parsed = ModelsConfigSchema.parse(
      JSON.parse(readFileSync(this.config.modelsConfigPath, "utf8")),
    );
    for (const provider of parsed.providers) {
      if (providerSpec(provider.id)?.kind !== "llm")
        throw new Error(`models.config.json: "${provider.id}" is not a known model provider.`);
    }
    this.configs = parsed.providers;
    this.configuredDefault = parsed.default;
  }

  // Called when a project's keys change, so the next call uses the new ones.
  forget(_projectId: string): void {
    this.modelLists.clear();
  }

  private async models(
    provider: ProviderConfig,
    credential: ResolvedCredential,
  ): Promise<{ models: ModelOption[]; note?: string }> {
    const option = (id: string, label?: string): ModelOption => ({
      ref: `${provider.id}:${id}`,
      label: label ?? id,
    });
    if (provider.models !== "auto")
      return { models: provider.models.map((m) => option(m.id, m.label)) };
    if (provider.type === "anthropic")
      return { models: [], note: `List ${provider.label}'s models in models.config.json.` };

    const key = `${provider.id}|${fingerprint(credential.secret)}`;
    const cached = this.modelLists.get(key);
    if (cached && Date.now() - cached.at < MODEL_LIST_TTL_MS) return cached;

    const result: { models: ModelOption[]; note?: string } = { models: [] };
    try {
      const filter = new RegExp(provider.autoFilter ?? "");
      const client = new OpenAI({
        apiKey: credential.secret,
        baseURL: provider.baseURL,
        timeout: 10_000,
        maxRetries: 0,
      });
      const ids: string[] = [];
      for await (const model of client.models.list()) {
        const id = model.id.replace(/^models\//, "");
        if (filter.test(id) && !NOT_CHAT.test(id)) ids.push(id);
      }
      result.models = ids.sort((a, b) => b.localeCompare(a)).map((id) => option(id));
    } catch (err) {
      this.logger.warn(`Could not list ${provider.label} models: ${String(err)}`);
      result.note = "The key was not accepted, or the model list could not be loaded.";
    }
    this.modelLists.set(key, { at: Date.now(), ...result });
    return result;
  }

  async describe(projectId: string): Promise<ProviderInfo[]> {
    return Promise.all(
      this.configs.map(async (provider) => {
        const credential = await this.credentials.resolve(projectId, provider.id);
        if (!credential) {
          // Still list a fixed catalog, so the owner can see what a key unlocks.
          const models =
            provider.models === "auto"
              ? []
              : provider.models.map((m) => ({
                  ref: `${provider.id}:${m.id}`,
                  label: m.label ?? m.id,
                }));
          return {
            id: provider.id,
            label: provider.label,
            available: false,
            source: null,
            note: "Add an API key under Integrations",
            models,
          };
        }
        if (credential.rejected) {
          return {
            id: provider.id,
            label: provider.label,
            available: false,
            source: credential.source,
            note: `Key rejected: ${credential.rejected}`,
            models: [],
          };
        }
        const { models, note } = await this.models(provider, credential);
        return {
          id: provider.id,
          label: provider.label,
          available: true,
          source: credential.source,
          note,
          models,
        };
      }),
    );
  }

  // LLM_MODEL, then the configured default if its provider is connected, then
  // the first model of any connected provider.
  async defaultRef(projectId: string): Promise<string> {
    if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
    const providers = await this.describe(projectId);
    const connected = providers.filter((p) => p.available && p.models.length);
    const preferred = this.configuredDefault;
    if (preferred && connected.some((p) => preferred.startsWith(`${p.id}:`))) return preferred;
    return connected[0]?.models[0]!.ref ?? preferred ?? "";
  }

  // The client for a call, using the project's key for that provider.
  async resolve(
    projectId: string,
    requested?: string,
  ): Promise<{ ref: string; llm: LlmProvider }> {
    const ref = requested || (await this.defaultRef(projectId));
    const split = ref.indexOf(":");
    const provider = this.configs.find((p) => p.id === ref.slice(0, split));
    const model = ref.slice(split + 1);
    if (split < 1 || !model || !provider)
      throw new BadRequestException(
        `Unknown model "${ref}". Use "<provider>:<model>".`,
      );

    const credential = await this.credentials.resolve(projectId, provider.id);
    if (!credential)
      throw new BadRequestException(
        `${provider.label} is not connected. Add its API key under Integrations.`,
      );

    const key = `${ref}|${fingerprint(credential.secret)}`;
    let llm = this.instances.get(key);
    if (!llm) {
      llm =
        provider.type === "anthropic"
          ? new AnthropicProvider(model, credential.secret)
          : new OpenAiCompatibleProvider({
              apiKey: credential.secret,
              baseURL: provider.baseURL,
              model,
            });
      this.instances.set(key, llm);
    }
    return { ref, llm };
  }
}
