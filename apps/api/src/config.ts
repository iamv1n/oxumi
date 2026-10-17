import { Injectable } from "@nestjs/common";
import path from "node:path";

// Read once at startup, after main.ts has loaded the repo-level .env file.
@Injectable()
export class AppConfig {
  readonly port = Number(process.env.API_PORT ?? 4000);
  // The app (apps/web): the one origin CORS allows, and where the links in
  // emails (password reset) point. Not the public site, which is on 3000.
  readonly webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3100";
  // Where this API is reachable from the internet. The telephony provider
  // connects back here, so phone calls need it (a tunnel in development).
  readonly publicUrl = process.env.PUBLIC_URL ?? "";
  readonly databaseUrl =
    process.env.DATABASE_URL ??
    "postgres://callflow:callflow@localhost:5434/callflow";
  // Accounts with these emails are made admins at startup and at signup, so
  // a fresh deployment has a way into /admin. Comma-separated.
  readonly adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  readonly flowsDir =
    process.env.FLOWS_DIR ?? path.resolve(process.cwd(), "../../flows");
  readonly modelsConfigPath =
    process.env.MODELS_CONFIG ??
    path.resolve(process.cwd(), "../../models.config.json");

  readonly elevenLabs = {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    host: process.env.ELEVENLABS_HOST || "api.elevenlabs.io",
    voiceId: process.env.ELEVENLABS_VOICE_ID || undefined,
    ttsModel: process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
    sttModel: process.env.ELEVENLABS_STT_MODEL || "scribe_v2_realtime",
    silenceSecs: Number(process.env.STT_SILENCE_SECS ?? 0.7),
  };
}
