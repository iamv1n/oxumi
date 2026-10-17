import { BadRequestException, Injectable } from "@nestjs/common";
import { AppConfig } from "../config";
import {
  CredentialsService,
  PROVIDERS,
  providerSpec,
} from "../credentials/credentials.service";
import { ElevenLabsSpeech } from "./elevenlabs";
import { SarvamSpeech } from "./sarvam";
import type { SpeechProvider } from "./types";

export interface SpeechInfo {
  id: string;
  label: string;
  available: boolean;
  source: "project" | "platform" | null;
  // Whether a default voice is set; an agent can still choose its own.
  voiceSet: boolean;
}

const SPEECH_IDS = PROVIDERS.filter((p) => p.kind === "speech").map((p) => p.id);

// Picks the speech service for a call from the project's connected providers.
@Injectable()
export class SpeechRegistry {
  constructor(
    private config: AppConfig,
    private credentials: CredentialsService,
  ) {}

  async describe(projectId: string): Promise<SpeechInfo[]> {
    return Promise.all(
      SPEECH_IDS.map(async (id) => {
        const credential = await this.credentials.resolve(projectId, id);
        const platformVoice =
          id === "elevenlabs" && credential?.source === "platform"
            ? this.config.elevenLabs.voiceId
            : undefined;
        return {
          id,
          label: providerSpec(id)!.label,
          available: Boolean(credential) && !credential?.rejected,
          source: credential?.source ?? null,
          voiceSet: Boolean(credential?.options.voiceId || platformVoice),
        };
      }),
    );
  }

  // `preferred` is the agent's choice; without one, the first connected
  // provider is used. Null means no speech service is connected.
  async forProject(projectId: string, preferred?: string): Promise<SpeechProvider | null> {
    if (preferred && !SPEECH_IDS.includes(preferred))
      throw new BadRequestException(`Unknown speech provider "${preferred}".`);
    for (const id of preferred ? [preferred] : SPEECH_IDS) {
      const credential = await this.credentials.resolve(projectId, id);
      if (!credential) continue;
      if (id === "sarvam") {
        return new SarvamSpeech({
          apiKey: credential.secret,
          speaker: credential.options.voiceId,
          ttsModel: credential.options.ttsModel || "bulbul:v3",
          sttModel: "saaras:v4",
        });
      }
      return new ElevenLabsSpeech({
        ...this.config.elevenLabs,
        apiKey: credential.secret,
        voiceId:
          credential.options.voiceId ||
          (credential.source === "platform" ? this.config.elevenLabs.voiceId : undefined),
      });
    }
    if (preferred)
      throw new BadRequestException(
        `${providerSpec(preferred)!.label} is not connected. Add its API key under Integrations.`,
      );
    return null;
  }
}
