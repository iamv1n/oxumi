import type { Method } from "./ui";

// The map of the docs: every page, and every section a reader can link to.
// The sidebar, the search and the scroll-spy are all driven from this list,
// so a section missing here is unreachable from navigation.

export interface NavSection {
  id: string;
  title: string;
  // Endpoints carry their method and path, for the sidebar and for search.
  method?: Method;
  path?: string;
  // A label that starts a new group inside the page's section list.
  group?: string;
}

export interface NavPage {
  href: string;
  title: string;
  group: "Get started" | "Guides" | "Reference";
  sections: NavSection[];
}

export const NAV: NavPage[] = [
  {
    href: "/docs",
    title: "Overview",
    group: "Get started",
    sections: [
      { id: "at-a-glance", title: "At a glance" },
      { id: "quickstart", title: "First call in five minutes" },
      { id: "guides", title: "Where to go next" },
      { id: "know-first", title: "What to know first" },
    ],
  },
  {
    href: "/docs/authentication",
    title: "Authentication",
    group: "Get started",
    sections: [
      { id: "sending", title: "Sending the key" },
      { id: "keys", title: "API keys" },
      { id: "statuses", title: "Key statuses" },
      { id: "rotation", title: "Rotating a key" },
      { id: "server-side", title: "Keep keys on your server" },
    ],
  },
  {
    href: "/docs/placing-calls",
    title: "Place a call",
    group: "Get started",
    sections: [
      { id: "request", title: "The request" },
      { id: "checks", title: "Checks before dialling" },
      { id: "variables", title: "Variables" },
      { id: "metadata", title: "Metadata" },
      { id: "provider", title: "Provider and model" },
      { id: "after", title: "After the request" },
      { id: "unreached", title: "When nobody answers" },
      { id: "hanging-up", title: "Hanging up" },
    ],
  },
  {
    href: "/docs/webhooks",
    title: "Receive the result",
    group: "Get started",
    sections: [
      { id: "setup", title: "Set up an endpoint" },
      { id: "payload", title: "The payload" },
      { id: "verify", title: "Verify the signature" },
      { id: "respond", title: "Respond quickly" },
      { id: "retries", title: "Retries" },
      { id: "idempotency", title: "Handle repeats" },
      { id: "testing", title: "Test deliveries" },
    ],
  },
  {
    href: "/docs/conversations",
    title: "Text conversations",
    group: "Guides",
    sections: [
      { id: "how", title: "How it works" },
      { id: "start", title: "Start a conversation" },
      { id: "reply", title: "Relay each message" },
      { id: "ending", title: "How a conversation ends" },
      { id: "limits", title: "Limits" },
    ],
  },
  {
    href: "/docs/errors",
    title: "Errors",
    group: "Guides",
    sections: [
      { id: "shape", title: "Error body" },
      { id: "statuses", title: "Status codes" },
      { id: "bad-requests", title: "What a 400 means" },
      { id: "known-issues", title: "Known issues" },
    ],
  },
  {
    href: "/docs/rate-limits",
    title: "Rate limits",
    group: "Guides",
    sections: [
      { id: "limit", title: "The limit" },
      { id: "headers", title: "Headers" },
      { id: "handling", title: "Handling 429" },
    ],
  },
  {
    href: "/docs/reference",
    title: "API reference",
    group: "Reference",
    sections: [
      { id: "endpoints", title: "All endpoints" },
      { id: "list-agents", title: "List agents", method: "GET", path: "/v1/agents", group: "Agents" },
      { id: "get-agent", title: "Retrieve an agent", method: "GET", path: "/v1/agents/:id" },
      { id: "place-call", title: "Place a call", method: "POST", path: "/v1/calls", group: "Calls" },
      { id: "list-calls", title: "List calls", method: "GET", path: "/v1/calls" },
      { id: "get-call", title: "Retrieve a call", method: "GET", path: "/v1/calls/:id" },
      { id: "hang-up-call", title: "Hang up a call", method: "DELETE", path: "/v1/calls/:id" },
      {
        id: "start-conversation",
        title: "Start a conversation",
        method: "POST",
        path: "/v1/conversations",
        group: "Conversations",
      },
      {
        id: "send-message",
        title: "Send a message",
        method: "POST",
        path: "/v1/conversations/:id/messages",
      },
      {
        id: "end-conversation",
        title: "End a conversation",
        method: "DELETE",
        path: "/v1/conversations/:id",
      },
      { id: "agent-object", title: "The Agent object", group: "Objects" },
      { id: "call-object", title: "The Call object" },
      { id: "turn-object", title: "The Turn object" },
      { id: "reply-object", title: "The Reply object" },
      { id: "event-object", title: "The webhook event" },
    ],
  },
  {
    href: "/docs/changelog",
    title: "Versioning",
    group: "Reference",
    sections: [
      { id: "versioning", title: "How the API is versioned" },
      { id: "v1", title: "What v1 contains" },
    ],
  },
];

// The reference's endpoints, for its index table.
export const ENDPOINTS = NAV.find((page) => page.href === "/docs/reference")!.sections.filter(
  (section): section is NavSection & { method: Method; path: string } => Boolean(section.method),
);

export interface SearchEntry {
  href: string;
  title: string;
  page: string;
  method?: Method;
  path?: string;
}

export const SEARCH_INDEX: SearchEntry[] = NAV.flatMap((page) => [
  { href: page.href, title: page.title, page: page.group },
  ...page.sections.map((section) => ({
    href: `${page.href}#${section.id}`,
    title: section.title,
    page: page.title,
    method: section.method,
    path: section.path,
  })),
]);

// Ranked matches for a query: titles and paths that start with it first,
// then those that merely contain every word.
export function search(query: string, limit = 8): SearchEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of SEARCH_INDEX) {
    const title = entry.title.toLowerCase();
    const haystack = `${title} ${entry.path ?? ""} ${entry.method ?? ""} ${entry.page}`.toLowerCase();
    if (!words.every((word) => haystack.includes(word))) continue;
    const first = words[0]!;
    const score =
      (title.startsWith(first) ? 0 : title.includes(first) ? 1 : 2) +
      (entry.href.includes("#") ? 0.5 : 0);
    scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
