import { WsAdapter } from "@nestjs/platform-ws";
import type { IncomingMessage, Server } from "node:http";
import { parseStreamPath, STREAM_PATH } from "./vobiz";

// Gateways are matched on an exact path, but Vobiz can only be told a call's
// id and token as segments of the path it connects to. This puts them in the
// query before the match is made, so its gateway is reached like any other.
export class PhoneWsAdapter extends WsAdapter {
  private rewritten = new WeakSet<Server>();

  protected ensureHttpServerExists(port: number, httpServer?: Server): Server | undefined {
    const server = super.ensureHttpServerExists(port, httpServer) ?? httpServer;
    if (server && !this.rewritten.has(server)) {
      this.rewritten.add(server);
      server.prependListener("upgrade", (request: IncomingMessage) => {
        request.url = rewriteVobizUrl(request.url ?? "");
      });
    }
    return server;
  }
}

export function rewriteVobizUrl(url: string): string {
  const pathname = url.split("?")[0]!;
  const parsed = parseStreamPath(pathname);
  if (!parsed) return url;
  const query = new URLSearchParams({ callId: parsed.callId, token: parsed.token });
  return `${STREAM_PATH}?${query.toString()}`;
}
