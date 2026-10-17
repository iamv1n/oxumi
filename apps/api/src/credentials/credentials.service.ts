import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProviderCredential } from "./credential.entity";
import { open, seal } from "./vault";

export type ProviderKind = "llm" | "speech" | "telephony";

export interface ProviderSpec {
  id: string;
  label: string;
  kind: ProviderKind;
  // Server-wide fallback key, used when a project has not saved its own.
  envKey: string;
  // Where the owner creates a key.
  keysUrl: string;
  // What this provider calls its secret, e.g. "Auth token".
  secretLabel: string;
  // Non-secret options the owner can set alongside the key. A provider is
  // only usable once every required one is filled in.
  options: ProviderOption[];
  // Options the key is tested together with. Changing one makes the last
  // test result stale.
  testedWith?: string[];
}

export interface ProviderOption {
  name: string;
  label: string;
  hint: string;
  required?: boolean;
  // The only values accepted, when the option is a choice.
  choices?: { value: string; label: string }[];
}

// Every outside service a project can connect.
export const PROVIDERS: ProviderSpec[] = [
  {
    id: "anthropic",
    secretLabel: "API key",
    label: "Anthropic (Claude)",
    kind: "llm",
    envKey: "ANTHROPIC_API_KEY",
    keysUrl: "https://console.anthropic.com/settings/keys",
    options: [],
  },
  {
    id: "openai",
    secretLabel: "API key",
    label: "OpenAI",
    kind: "llm",
    envKey: "OPENAI_API_KEY",
    keysUrl: "https://platform.openai.com/api-keys",
    options: [],
  },
  {
    id: "gemini",
    secretLabel: "API key",
    label: "Google Gemini",
    kind: "llm",
    envKey: "GEMINI_API_KEY",
    keysUrl: "https://aistudio.google.com/apikey",
    options: [],
  },
  {
    id: "elevenlabs",
    secretLabel: "API key",
    label: "ElevenLabs",
    kind: "speech",
    envKey: "ELEVENLABS_API_KEY",
    keysUrl: "https://elevenlabs.io/app/settings/api-keys",
    options: [
      { name: "voiceId", label: "Default voice ID", hint: "Used when an agent does not set its own voice." },
    ],
  },
  {
    id: "sarvam",
    secretLabel: "API subscription key",
    label: "Sarvam AI",
    kind: "speech",
    envKey: "SARVAM_API_KEY",
    keysUrl: "https://dashboard.sarvam.ai/",
    options: [
      { name: "voiceId", label: "Default speaker", hint: "A Sarvam speaker name such as shubh or ritu_hi_conversational." },
      { name: "ttsModel", label: "Speech model", hint: "bulbul:v3 unless you need another." },
    ],
  },
  {
    id: "twilio",
    secretLabel: "Auth token",
    label: "Twilio",
    kind: "telephony",
    // The key stored for Twilio is the account's auth token.
    envKey: "TWILIO_AUTH_TOKEN",
    keysUrl: "https://console.twilio.com/",
    testedWith: ["accountSid"],
    options: [
      { name: "accountSid", label: "Account SID", hint: "Starts with AC. Found on the Twilio console home page.", required: true },
      { name: "fromNumber", label: "Calling number", hint: "A Twilio number you own, in international format, e.g. +14155550123.", required: true },
    ],
  },
  {
    id: "exotel",
    secretLabel: "API token",
    label: "Exotel",
    kind: "telephony",
    // The key stored for Exotel is the API token.
    envKey: "EXOTEL_API_TOKEN",
    keysUrl: "https://my.exotel.com/apisettings/site#api-credentials",
    testedWith: ["apiKey", "accountSid", "host"],
    options: [
      { name: "apiKey", label: "API key", hint: "From API settings in the Exotel dashboard.", required: true },
      { name: "accountSid", label: "Account SID", hint: "Your Exotel account's SID, from the same page.", required: true },
      { name: "callerId", label: "ExoPhone", hint: "The Exotel number calls are placed from.", required: true },
      { name: "appId", label: "App ID", hint: "The Exotel app whose Voicebot step points to this server. See the setup steps.", required: true },
      {
        name: "host",
        label: "API host",
        hint: "api.exotel.com (Singapore) or api.in.exotel.com (Mumbai). Defaults to api.exotel.com.",
        // The token is sent to this host, so it is never free text.
        choices: [
          { value: "api.exotel.com", label: "api.exotel.com (Singapore)" },
          { value: "api.in.exotel.com", label: "api.in.exotel.com (Mumbai)" },
        ],
      },
    ],
  },
  {
    id: "vobiz",
    secretLabel: "Auth token",
    label: "Vobiz",
    kind: "telephony",
    // The key stored for Vobiz is the account's auth token.
    envKey: "VOBIZ_AUTH_TOKEN",
    keysUrl: "https://console.vobiz.ai",
    testedWith: ["authId"],
    options: [
      { name: "authId", label: "Auth ID", hint: "Starts with MA_. Shown with the auth token on the Vobiz console dashboard.", required: true },
      { name: "fromNumber", label: "Calling number", hint: "A Vobiz number on your account, in international format, e.g. +918071387423.", required: true },
    ],
  },
];

export const providerSpec = (id: string) => PROVIDERS.find((p) => p.id === id);

export interface ResolvedCredential {
  secret: string;
  options: Record<string, string>;
  // Whose key this is: the project's own, or the server's fallback.
  source: "project" | "platform";
  // The reason, when the last test of this key failed. Such a key is still
  // tried on calls (the provider may have fixed it), but is not shown as ready.
  rejected: string | null;
}

export interface CredentialView {
  provider: string;
  label: string;
  kind: ProviderKind;
  keysUrl: string;
  secretLabel: string;
  optionFields: ProviderSpec["options"];
  // Required options still empty; the provider cannot be used until filled.
  missing: string[];
  // "project": the project saved its own key. "platform": none saved, but the
  // server has a fallback. null: not connected at all.
  source: "project" | "platform" | null;
  // e.g. "…a1B2", only for a project key.
  hint: string | null;
  options: Record<string, string>;
  verifiedAt: Date | null;
  verifyError: string | null;
  updatedAt: Date | null;
}

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(ProviderCredential)
    private credentials: Repository<ProviderCredential>,
  ) {}

  async list(projectId: string): Promise<CredentialView[]> {
    const saved = await this.credentials.findBy({ projectId });
    return PROVIDERS.map((spec) => {
      const row = saved.find((c) => c.provider === spec.id);
      return {
        provider: spec.id,
        label: spec.label,
        kind: spec.kind,
        keysUrl: spec.keysUrl,
        secretLabel: spec.secretLabel,
        optionFields: spec.options,
        missing: row
          ? spec.options
              .filter((o) => o.required && !row.options[o.name])
              .map((o) => o.name)
          : [],
        source: row ? "project" : process.env[spec.envKey] ? "platform" : null,
        hint: row ? `…${row.hint}` : null,
        options: row?.options ?? {},
        verifiedAt: row?.verifiedAt ?? null,
        verifyError: row?.verifyError ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  // Saves or replaces a provider's key. Omitting the secret updates only the
  // options of an existing credential.
  async save(
    projectId: string,
    provider: string,
    input: { secret?: unknown; options?: unknown },
  ): Promise<void> {
    const spec = providerSpec(provider);
    if (!spec) throw new NotFoundException(`Unknown provider "${provider}".`);

    const options: Record<string, string> = {};
    if (input.options && typeof input.options === "object") {
      for (const field of spec.options) {
        const value = (input.options as Record<string, unknown>)[field.name];
        if (typeof value !== "string" || !value.trim()) continue;
        const text = value.trim().slice(0, 200);
        if (field.choices && !field.choices.some((choice) => choice.value === text))
          throw new BadRequestException(
            `${field.label} must be one of: ${field.choices.map((c) => c.value).join(", ")}.`,
          );
        options[field.name] = text;
      }
    }

    const existing = await this.credentials.findOneBy({ projectId, provider });
    const secret = typeof input.secret === "string" ? input.secret.trim() : "";
    if (!secret) {
      if (!existing) throw new BadRequestException("Enter the API key.");
      // The last test says nothing about an account detail that has changed.
      const stale = (spec.testedWith ?? []).some(
        (name) => (existing.options[name] ?? "") !== (options[name] ?? ""),
      );
      await this.credentials.update(existing.id, {
        options,
        ...(stale ? { verifiedAt: null, verifyError: null } : {}),
      });
      return;
    }
    if (secret.length < 8 || secret.length > 500 || /\s/.test(secret))
      throw new BadRequestException("That does not look like an API key.");

    await this.credentials.save(
      this.credentials.create({
        ...(existing ? { id: existing.id } : {}),
        projectId,
        provider,
        sealedSecret: seal(secret),
        hint: secret.slice(-4),
        options,
        // A new key has not been tested yet.
        verifiedAt: null,
        verifyError: null,
      }),
    );
  }

  async remove(projectId: string, provider: string): Promise<void> {
    await this.credentials.delete({ projectId, provider });
  }

  async markVerified(projectId: string, provider: string, error: string | null): Promise<void> {
    await this.credentials.update(
      { projectId, provider },
      { verifiedAt: error ? null : new Date(), verifyError: error },
    );
  }

  // The key to use for a provider: the project's own, else the server's.
  async resolve(projectId: string, provider: string): Promise<ResolvedCredential | null> {
    const spec = providerSpec(provider);
    if (!spec) return null;
    const row = await this.credentials
      .createQueryBuilder("c")
      .addSelect("c.sealedSecret")
      .where("c.projectId = :projectId AND c.provider = :provider", { projectId, provider })
      .getOne();
    if (row) {
      return {
        secret: open(row.sealedSecret),
        options: row.options,
        source: "project",
        rejected: row.verifyError,
      };
    }
    const fallback = process.env[spec.envKey];
    return fallback
      ? { secret: fallback, options: {}, source: "platform", rejected: null }
      : null;
  }
}
