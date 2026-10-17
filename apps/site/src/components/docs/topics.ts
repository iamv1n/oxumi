import { backoffSamples } from "@oxumi/ui/docs/backoff";
import {
  buildExamples,
  CALL_ID,
  CONVERSATION_ID,
  CONVERSATION_REPLY,
  CONVERSATION_STARTED,
  DOCS_CONTEXT,
  ERRORS,
  type ExampleContext,
} from "@oxumi/ui/docs/examples";
import type { Samples } from "@oxumi/ui/docs/languages";
import { BASE_URL, type RequestSpec, requestSamples } from "@oxumi/ui/docs/request";
import { AGENT_DETAIL, AGENT_DETAIL_TRIMMED, AGENT_LIST, CALL_DETAIL, CALL_LIST } from "@oxumi/ui/docs/samples";
import { AGENT_LIST_TITLE } from "@oxumi/ui/docs/sampleTitles";
import { VERIFY_SAMPLES } from "@oxumi/ui/docs/verify";

// The samples, by topic. A topic is a function from a context (whose values
// are the base URL, the key placeholder, the agent, its variables and so on)
// to one piece of code in all nine languages plus the response to expect.
// The docs call these with no arguments; the app passes the project's own
// values, so both show the same sample from one definition.

export interface TopicContext extends Partial<ExampleContext> {
  // Defaults to the API this site talks to.
  baseUrl?: string;
  // Shown in place of the key, e.g. "YOUR_API_KEY". When absent, samples
  // read the OXUMI_API_KEY environment variable.
  apiKey?: string;
  callId?: string;
  conversationId?: string;
  // The message relayed by sendMessage.
  text?: string;
}

export interface TopicResponse {
  status?: number;
  title?: string;
  body: unknown;
  // "captured": copied from a real response. "example": written from the
  // server code, because the request cannot complete in the docs environment.
  provenance: "captured" | "example";
}

export interface TopicSample {
  title: string;
  // Absent for code that is not a single HTTP request (verifyWebhook).
  request?: RequestSpec;
  code: Samples;
  response?: TopicResponse;
}

export type Topic = (context?: TopicContext) => TopicSample;

function request(title: string, spec: RequestSpec, context: TopicContext, response?: TopicResponse) {
  return {
    title,
    request: spec,
    code: requestSamples(spec, { baseUrl: context.baseUrl, apiKey: context.apiKey }),
    response,
  } satisfies TopicSample;
}

const examples = (context: TopicContext) => buildExamples({ ...DOCS_CONTEXT, ...context });
// Captured responses describe the docs' own project; with another project's
// values in the request they would not match, so they are offered as examples.
const captured = (context: TopicContext): TopicResponse["provenance"] =>
  context.agentId && context.agentId !== DOCS_CONTEXT.agentId ? "example" : "captured";

export const authenticate: Topic = (context = {}) =>
  request("Authenticated request", { method: "GET", path: "/v1/agents", result: "agents" }, context, {
    status: 401,
    title: "Without a valid key",
    body: ERRORS.unauthorized,
    provenance: "captured",
  });

export const listAgents: Topic = (context = {}) =>
  request("List agents", { method: "GET", path: "/v1/agents", result: "agents" }, context, {
    status: 200,
    // Says so when the captured list was shortened for display.
    title: AGENT_LIST_TITLE,
    body: AGENT_LIST,
    provenance: captured(context),
  });

export const getAgent: Topic = (context = {}) =>
  request(
    "Retrieve an agent",
    { method: "GET", path: `/v1/agents/${context.agentId ?? DOCS_CONTEXT.agentId}`, result: "agent" },
    context,
    {
      status: 200,
      title: `Response · ${AGENT_DETAIL_TRIMMED}`,
      body: AGENT_DETAIL,
      provenance: captured(context),
    },
  );

export const placeCall: Topic = (context = {}) => {
  const { placeCallBody, placedCall } = examples(context);
  return request(
    "Place a call",
    { method: "POST", path: "/v1/calls", body: placeCallBody, result: "call" },
    context,
    { status: 202, body: placedCall, provenance: "example" },
  );
};

export const listCalls: Topic = (context = {}) =>
  request(
    "List calls",
    { method: "GET", path: "/v1/calls", query: { limit: 1 }, result: "calls" },
    context,
    { status: 200, body: CALL_LIST, provenance: captured(context) },
  );

export const getCall: Topic = (context = {}) =>
  request(
    "Retrieve a call",
    { method: "GET", path: `/v1/calls/${context.callId ?? CALL_DETAIL.id}`, result: "call" },
    context,
    { status: 200, body: CALL_DETAIL, provenance: captured(context) },
  );

export const hangUpCall: Topic = (context = {}) =>
  request(
    "Hang up a call",
    { method: "DELETE", path: `/v1/calls/${context.callId ?? CALL_ID}` },
    context,
  );

export const startConversation: Topic = (context = {}) => {
  const { placeCallBody } = examples(context);
  return request(
    "Start a conversation",
    {
      method: "POST",
      path: "/v1/conversations",
      body: { agentId: placeCallBody.agentId, variables: placeCallBody.variables },
      result: "turn",
    },
    context,
    { status: 201, body: CONVERSATION_STARTED, provenance: "example" },
  );
};

export const sendMessage: Topic = (context = {}) =>
  request(
    "Send a message",
    {
      method: "POST",
      path: `/v1/conversations/${context.conversationId ?? CONVERSATION_ID}/messages`,
      body: { text: context.text ?? "Just crossed the Adilabad toll." },
      result: "turn",
    },
    context,
    { status: 200, body: CONVERSATION_REPLY, provenance: "example" },
  );

export const endConversation: Topic = (context = {}) =>
  request(
    "End a conversation",
    { method: "DELETE", path: `/v1/conversations/${context.conversationId ?? CONVERSATION_ID}` },
    context,
  );

// Not a request: the function your webhook receiver calls on every delivery.
// The response shown is the event it protects.
export const verifyWebhook: Topic = (context = {}) => ({
  title: "Verify a webhook signature",
  code: VERIFY_SAMPLES,
  response: {
    title: "call.completed, as posted to you",
    body: examples(context).completedEvent,
    provenance: "example",
  },
});

// Not a single request: a helper that waits and retries while the API
// answers 429. The response shown is the refusal it handles.
export const handleRateLimit: Topic = (context = {}) => ({
  title: "Wait and retry on 429",
  code: backoffSamples({ baseUrl: context.baseUrl, apiKey: context.apiKey }),
  response: { status: 429, body: ERRORS.rateLimited, provenance: "captured" },
});

export const TOPICS = {
  authenticate,
  listAgents,
  getAgent,
  placeCall,
  listCalls,
  getCall,
  hangUpCall,
  startConversation,
  sendMessage,
  endConversation,
  verifyWebhook,
  handleRateLimit,
} as const;

export type TopicName = keyof typeof TOPICS;

export { BASE_URL };
