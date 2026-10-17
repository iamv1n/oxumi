import {
  buildExamples,
  CALL_ID,
  ERRORS,
  type ExampleContext,
} from "@oxumi/ui/docs/examples";
import type { RequestSpec } from "@oxumi/ui/docs/request";
import { AGENT_LIST, CALL_DETAIL } from "@oxumi/ui/docs/samples";
import { AGENT_LIST_TITLE } from "@oxumi/ui/docs/sampleTitles";
import type { Samples } from "@oxumi/ui/docs/languages";
import { BACKOFF_SAMPLES } from "@oxumi/ui/docs/backoff";
import { VERIFY_SAMPLES } from "@oxumi/ui/docs/verify";
import { API_RATE_LIMIT_PER_MINUTE, type ApiKey, type WebhookDelivery } from "@/lib/api";

// What the code panel shows for each thing the user can be looking at. The
// samples themselves come from the docs library (@oxumi/ui/docs); this file
// only chooses which ones, and fills in the project's own values.

export type CodeBlockSpec =
  // An API request, shown in the chosen language.
  | { kind: "request"; title: string; spec: RequestSpec }
  // Code the docs library has written out in every language.
  | { kind: "samples"; title: string; samples: Samples }
  // Server-side code the library has only in Node.js and Python so far.
  | { kind: "server"; title: string; node: string; python: string }
  | { kind: "json"; title: string; value: unknown; status?: number }
  | { kind: "http"; title: string; code: string };

export interface CodeView {
  // Where in the page this code belongs, e.g. "API keys".
  eyebrow: string;
  title: string;
  intro: string;
  // Written into requests in place of the key placeholder.
  keyHint?: string;
  blocks: CodeBlockSpec[];
}

export const START_STEPS = [
  {
    title: "Place a call",
    summary: "Your software asks for a call with one request.",
  },
  {
    title: "The call runs",
    summary: "We ring the number and the agent follows its flow.",
  },
  {
    title: "Your webhook gets the result",
    summary: "Outcome, answers and transcript are posted to you.",
  },
] as const;

export function startView(step: number, context: ExampleContext, keyHint?: string): CodeView {
  const examples = buildExamples(context);
  const eyebrow = `Get started · step ${step + 1} of ${START_STEPS.length}`;
  if (step === 0)
    return {
      eyebrow,
      title: "Place a call",
      intro:
        "Send the agent, the number to ring and a value for each of the agent's variables. The API answers at once; the call itself carries on in the background.",
      keyHint,
      blocks: [
        {
          kind: "request",
          title: "Request",
          spec: { method: "POST", path: "/v1/calls", body: examples.placeCallBody, result: "call" },
        },
        { kind: "json", title: "Response", value: examples.placedCall, status: 202 },
      ],
    };
  if (step === 1)
    return {
      eyebrow,
      title: "Check on a call",
      intro:
        "You do not have to ask: the webhook tells you when the call ends. To look in between, fetch the call by the id you were given.",
      keyHint,
      blocks: [
        {
          kind: "request",
          title: "Request",
          spec: { method: "GET", path: `/v1/calls/${CALL_ID}`, result: "call" },
        },
        { kind: "json", title: "Response", value: CALL_DETAIL, status: 200 },
      ],
    };
  return {
    eyebrow,
    title: "Receive the result",
    intro:
      "When the call ends, this is posted to every enabled webhook. Check the signature before trusting it, then answer with any 2xx status.",
    blocks: [
      { kind: "json", title: "POST to your webhook · call.completed", value: examples.completedEvent },
      { kind: "samples", title: "Verify the signature", samples: VERIFY_SAMPLES },
    ],
  };
}

export function keysView(key?: ApiKey): CodeView {
  return {
    eyebrow: "API keys",
    title: "Authenticate a request",
    intro: key
      ? `Send the key as a bearer token on every request. The sample shows the prefix of "${key.name}"; use the full key you copied when it was created.`
      : "Send a key as a bearer token on every request. Create a key to see it used here.",
    keyHint: key?.prefix,
    blocks: [
      {
        kind: "request",
        title: "Request",
        spec: { method: "GET", path: "/v1/agents", result: "agents" },
      },
      { kind: "json", title: AGENT_LIST_TITLE, value: AGENT_LIST, status: 200 },
      { kind: "json", title: "Without a valid key", value: ERRORS.unauthorized, status: 401 },
    ],
  };
}

// The request we sent for one delivery: its headers and exact payload.
function deliveryBlocks(delivery: WebhookDelivery, url?: string): CodeBlockSpec[] {
  return [
    {
      kind: "http",
      title: "Request we sent",
      code: [
        `POST ${url ?? "(deleted endpoint)"}`,
        "Content-Type: application/json",
        "User-Agent: Oxumi-Webhooks/1",
        `Oxumi-Event: ${delivery.event}`,
        `Oxumi-Delivery: ${delivery.id}`,
        "Oxumi-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>",
      ].join("\n"),
    },
    { kind: "json", title: `Payload · ${delivery.event}`, value: delivery.payload },
    {
      kind: "http",
      title: "Your endpoint answered",
      code:
        delivery.lastStatus !== null
          ? `HTTP ${delivery.lastStatus}`
          : (delivery.lastError ?? "No response yet"),
    },
  ];
}

export function webhooksView(
  context: ExampleContext,
  delivery?: WebhookDelivery,
  url?: string,
): CodeView {
  const verify: CodeBlockSpec = {
    kind: "samples",
    title: "Verify the signature",
    samples: VERIFY_SAMPLES,
  };
  if (delivery)
    return {
      eyebrow: "Webhooks · selected delivery",
      title: `${delivery.event} delivery`,
      intro:
        "Exactly what was sent for the delivery you selected, and how to check that it came from us.",
      blocks: [...deliveryBlocks(delivery, url), verify],
    };
  return {
    eyebrow: "Webhooks",
    title: "Verify a webhook",
    intro:
      "Anyone who learns your URL could post to it. Every delivery is signed with the endpoint's signing secret; check the signature before acting on the body.",
    blocks: [
      verify,
      {
        kind: "json",
        title: "Example body · call.completed",
        value: buildExamples(context).completedEvent,
      },
    ],
  };
}

// An example request for one row of the "requests by endpoint" table.
function routeSpec(method: string, route: string, context: ExampleContext): RequestSpec {
  const path = route
    .replace("/agents/:id", `/agents/${context.agentId}`)
    .replace(/:id\b/g, CALL_ID);
  const verb = method === "POST" || method === "DELETE" ? method : "GET";
  return {
    method: verb,
    path,
    body: verb === "POST" && route === "/v1/calls" ? buildExamples(context).placeCallBody : undefined,
  };
}

export function logsView(
  context: ExampleContext,
  selection:
    | { kind: "delivery"; delivery: WebhookDelivery; url?: string }
    | { kind: "route"; method: string; route: string; requests: number; errors: number }
    | null,
  keyHint?: string,
): CodeView {
  if (selection?.kind === "delivery")
    return {
      eyebrow: "Logs · selected delivery",
      title: `${selection.delivery.event} delivery`,
      intro: "Exactly what was sent for the delivery you selected, and what your endpoint said.",
      blocks: deliveryBlocks(selection.delivery, selection.url),
    };
  if (selection?.kind === "route")
    return {
      eyebrow: "Logs · selected endpoint",
      title: `${selection.method} ${selection.route}`,
      intro: `${selection.requests.toLocaleString()} requests in this period, ${selection.errors.toLocaleString()} answered with an error. Individual requests are not recorded, so this is an example of the call, not a captured one.`,
      keyHint,
      blocks: [
        {
          kind: "request",
          title: "Example request",
          spec: routeSpec(selection.method, selection.route, context),
        },
      ],
    };
  return {
    eyebrow: "Logs",
    title: "Select a row",
    intro:
      "Choose a webhook delivery to see the request we sent, or an endpoint to see how it is called.",
    blocks: [],
  };
}

export function usageView(): CodeView {
  return {
    eyebrow: "Usage",
    title: "Read the rate-limit headers",
    intro: `Each key may make ${API_RATE_LIMIT_PER_MINUTE} requests a minute. Every response says how many are left; a 429 says how long to wait.`,
    blocks: [
      {
        kind: "http",
        title: "On every response",
        code: [
          "HTTP/1.1 200 OK",
          `X-RateLimit-Limit: ${API_RATE_LIMIT_PER_MINUTE}`,
          "X-RateLimit-Remaining: <requests left this minute>",
          "X-RateLimit-Reset: <seconds until the minute resets>",
        ].join("\n"),
      },
      {
        kind: "http",
        title: "When the limit is passed",
        code: [
          "HTTP/1.1 429 Too Many Requests",
          "Retry-After: <seconds until the minute resets>",
          "X-RateLimit-Remaining: 0",
        ].join("\n"),
      },
      { kind: "server", title: "Wait and retry", node: BACKOFF_SAMPLES.javascript, python: BACKOFF_SAMPLES.python },
    ],
  };
}
