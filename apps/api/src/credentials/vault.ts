import { Logger } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Encrypts customers' provider keys before they reach the database
// (AES-256-GCM, a fresh nonce per value). The master key comes from
// CREDENTIALS_KEY and is never stored alongside the data.

const logger = new Logger("Vault");
let cached: Buffer | undefined;

function masterKey(): Buffer {
  if (cached) return cached;
  const fromEnv = process.env.CREDENTIALS_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64");
    if (key.length !== 32)
      throw new Error("CREDENTIALS_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).");
    return (cached = key);
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("CREDENTIALS_KEY is required in production to store provider keys.");

  // Development convenience only: a key kept in a git-ignored file so stored
  // credentials survive restarts.
  const file = path.resolve(process.cwd(), "../../.dev-credentials.key");
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600 });
    logger.warn(`CREDENTIALS_KEY is not set; generated a development key at ${file}.`);
  }
  return (cached = Buffer.from(readFileSync(file, "utf8").trim(), "base64"));
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${body.toString("base64")}`;
}

export function open(sealed: string): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unreadable credential.");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// A short, non-reversible tag for a secret, used as a cache key.
export const fingerprint = (secret: string) =>
  createHash("sha256").update(secret).digest("hex").slice(0, 16);
