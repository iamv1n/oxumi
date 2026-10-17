import { BadRequestException } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Webhook URLs are supplied by customers and fetched by our servers, so they
// must not be able to point at our own network. In production only public
// HTTPS addresses are allowed; development also permits local receivers.

function isPrivate(address: string): boolean {
  if (address.includes(":")) {
    const a = address.toLowerCase();
    return (
      a === "::1" ||
      a === "::" ||
      a.startsWith("fc") ||
      a.startsWith("fd") ||
      a.startsWith("fe80") ||
      a.startsWith("::ffff:") // IPv4-mapped: treat as internal rather than parse
    );
  }
  const [a = 0, b = 0] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException("Enter a valid URL.");
  }
  const production = process.env.NODE_ENV === "production";
  if (url.protocol !== "https:" && (production || url.protocol !== "http:"))
    throw new BadRequestException("Webhook URLs must use https.");
  if (url.username || url.password)
    throw new BadRequestException("Webhook URLs cannot contain credentials.");
  if (!production) return url;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address);
  if (!addresses.length)
    throw new BadRequestException("That host could not be resolved.");
  if (addresses.some(isPrivate))
    throw new BadRequestException("Webhook URLs must point to a public address.");
  return url;
}
