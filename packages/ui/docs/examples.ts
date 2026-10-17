// Samples written from the server code, for requests that cannot complete in
// the environment these docs were built in (no telephony or model provider
// is connected there). Every key is one the code emits; the values are
// illustrative. The docs label these "Example".

export const AGENT_ID = "81ee2426-7abe-444b-96f8-b8e195ddde49";
export const CALL_ID = "0b9f6c1e-52a7-4d1c-9b6e-3f2a8d4c7e10";
export const CONVERSATION_ID = "5d2c9a44-8e1b-4f0a-b7c3-91e6a2d4f8b0";

export const VARIABLES = {
  driver_name: "Ramesh",
  company: "Shakti Logistics",
  route: "Nagpur to Hyderabad",
  planned_eta: "tonight at 9 pm",
};

// What the samples are about. The docs use the defaults below; the in-app
// quickstart passes the project's own agent, variables and fields, so both
// show the same samples from one definition.
export interface ExampleContext {
  agentId: string;
  agentName: string;
  variables: Record<string, string>;
  // Collected answers, keyed by the flow's field names.
  fields: Record<string, string | number | boolean>;
  turns: {
    index: number;
    caller: string | null;
    agent: string;
    interrupted: boolean;
    step: string;
  }[];
}

const TURNS: ExampleContext["turns"] = [
  {
    index: 1,
    caller: null,
    agent:
      "Namaste Ramesh ji, this is the automated assistant from Shakti Logistics, calling for a quick update on your Nagpur to Hyderabad trip. Where have you reached?",
    interrupted: false,
    step: "ask_location",
  },
  {
    index: 2,
    caller: "Just crossed the Adilabad toll.",
    agent: "Thank you. Will you reach by nine tonight?",
    interrupted: false,
    step: "ask_schedule",
  },
  {
    index: 3,
    caller: "No, there is a jam on the highway. It will be around midnight.",
    agent: "Understood. Is there any problem with the truck, the load or the paperwork?",
    interrupted: false,
    step: "ask_help",
  },
  {
    index: 4,
    caller: "No, all fine.",
    agent: "Thank you, your update is recorded. Drive safe.",
    interrupted: false,
    step: "goodbye",
  },
];

export const DOCS_CONTEXT: ExampleContext = {
  agentId: AGENT_ID,
  agentName: "Driver check-in",
  variables: VARIABLES,
  fields: {
    current_location: "Adilabad toll",
    on_schedule: false,
    delay_reason: "traffic",
    revised_eta: "around midnight",
    needs_help: false,
  },
  turns: TURNS,
};

const TO = "+919876543210";
const METADATA = { trip_id: "TRIP-2291" };
const MODEL = "anthropic:claude-haiku-5-5";

export function buildExamples(context: ExampleContext = DOCS_CONTEXT) {
  const placeCallBody = {
    agentId: context.agentId,
    to: TO,
    variables: context.variables,
    metadata: METADATA,
  };

  // POST /v1/calls → 202: the stored call once the provider has accepted it.
  const placedCall = {
    id: CALL_ID,
    projectId: "bf98c165-b0d8-4006-91b9-0c97df86ba15",
    agentId: context.agentId,
    channel: "phone",
    model: MODEL,
    variables: context.variables,
    fields: {},
    outcome: null,
    status: "ringing",
    error: null,
    to: TO,
    metadata: METADATA,
    telephony: "twilio",
    providerCallId: "CA5f0c2b6d1e9a4c7f8b3d2e1a0c9f8e7d",
    startedAt: "2026-10-12T14:02:11.412Z",
    endedAt: null,
  };

  // The body of a call.completed delivery, in the order the fields are
  // described. On the wire the key order differs (see "The payload").
  const completedEvent = {
    id: "c7a1e0d2-3b54-4f6a-9d8e-2f1b0a9c8d7e",
    event: "call.completed",
    createdAt: "2026-10-12T14:03:25.871Z",
    data: {
      call: {
        id: CALL_ID,
        agentId: context.agentId,
        agentName: context.agentName,
        channel: "phone",
        to: TO,
        status: "ended",
        outcome: "completed",
        error: null,
        fields: context.fields,
        variables: context.variables,
        metadata: METADATA,
        model: MODEL,
        startedAt: "2026-10-12T14:02:11.412Z",
        endedAt: "2026-10-12T14:03:25.803Z",
        durationSeconds: 74,
        turns: context.turns,
      },
    },
  };

  return { placeCallBody, placedCall, completedEvent };
}

const DOCS = buildExamples();
export const PLACE_CALL_BODY = DOCS.placeCallBody;
export const PLACED_CALL = DOCS.placedCall;
export const COMPLETED_EVENT = DOCS.completedEvent;

// The same event for a call nobody picked up.
export const UNREACHED_CALL = {
  id: CALL_ID,
  agentId: AGENT_ID,
  agentName: "Driver check-in",
  channel: "phone",
  to: "+919876543210",
  status: "ended",
  outcome: "failed",
  error: "Nobody answered.",
  fields: {},
  variables: VARIABLES,
  metadata: { trip_id: "TRIP-2291" },
  model: "anthropic:claude-haiku-5-5",
  startedAt: "2026-10-12T14:02:11.412Z",
  endedAt: "2026-10-12T14:02:43.006Z",
  durationSeconds: 32,
  turns: [],
};

export const CONVERSATION_STARTED = {
  callId: CONVERSATION_ID,
  reply:
    "Namaste Ramesh ji, this is the automated assistant from Shakti Logistics, calling for a quick update on your Nagpur to Hyderabad trip. Where have you reached?",
  fields: {},
  step: "ask_location",
  ended: false,
  outcome: null,
};

export const CONVERSATION_REPLY = {
  callId: CONVERSATION_ID,
  reply: "Thank you. Will you reach by nine tonight?",
  fields: { current_location: "Adilabad toll" },
  step: "ask_schedule",
  ended: false,
  outcome: null,
};

export const CONVERSATION_FINAL = {
  callId: CONVERSATION_ID,
  reply: "Thank you, your update is recorded. Drive safe.",
  fields: {
    current_location: "Adilabad toll",
    on_schedule: true,
    needs_help: false,
  },
  step: "goodbye",
  ended: true,
  outcome: "completed",
};

// Error bodies. All of these were captured from the running API.
export const ERRORS = {
  unauthorized: {
    message: "Missing or invalid API key. Send it as: Authorization: Bearer <key>",
    error: "Unauthorized",
    statusCode: 401,
  },
  badNumber: {
    message: 'to must be a phone number in international format, e.g. "+919876543210".',
    error: "Bad Request",
    statusCode: 400,
  },
  missingVariables: {
    message: "Missing variables: driver_name, company, route, planned_eta",
    error: "Bad Request",
    statusCode: 400,
  },
  notReady: {
    message: 'This agent\'s flow is not ready: "ask_question" is not connected to a next step.',
    error: "Unprocessable Entity",
    statusCode: 422,
  },
  notFound: { message: "Call not found.", error: "Not Found", statusCode: 404 },
  agentNotFound: { message: "Agent not found.", error: "Not Found", statusCode: 404 },
  notUuid: {
    message: "Validation failed (uuid is expected)",
    error: "Bad Request",
    statusCode: 400,
  },
  gone: {
    message: "This call has ended or expired. Start a new one.",
    error: "Gone",
    statusCode: 410,
  },
  noPublicUrl: {
    message:
      "Phone calls are not available: the server has no public URL configured (PUBLIC_URL).",
    error: "Service Unavailable",
    statusCode: 503,
  },
  notConnected: {
    message: "Anthropic is not connected. Add its API key under Integrations.",
    error: "Bad Request",
    statusCode: 400,
  },
  rateLimited: {
    statusCode: 429,
    message: "Rate limit of 120 requests per minute exceeded.",
  },
  internal: { statusCode: 500, message: "Internal server error" },
};
