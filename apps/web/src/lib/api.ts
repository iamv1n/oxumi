import type {
  CallState,
  DraftFlow,
  FieldValue,
  Flow,
  FlowIssue,
  NodeLayout,
  Outcome,
} from "@oxumi/flow-core";
import { API_URL } from "@oxumi/ui/lib/urls";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";

// NEXT_PUBLIC_API_URL, or http://localhost:4000 (defined in @oxumi/ui, which
// prints it in the code samples).
export { API_URL };
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws/call`;

// ---- Types (mirror the API's responses) ---------------------------------

// What a person may do in a project. Each role includes the ones before it.
export type ProjectRole = "viewer" | "editor" | "admin" | "owner";
export const PROJECT_ROLES: ProjectRole[] = ["viewer", "editor", "admin", "owner"];
export const atLeast = (role: ProjectRole | undefined, need: ProjectRole) =>
  role !== undefined && PROJECT_ROLES.indexOf(role) >= PROJECT_ROLES.indexOf(need);

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  ownerId: string | null;
  // The signed-in person's role in this project.
  role: ProjectRole;
}
export interface ProjectListItem extends Project {
  agentCount: number;
  callCount: number;
}
export interface ProjectStats {
  agents: number;
  calls: number;
  completed: number;
  // Keyed by outcome; calls still running are under "in_progress".
  outcomes: Record<string, number>;
  medianFirstTextMs: number | null;
  medianFirstAudioMs: number | null;
}

export interface AgentSummary {
  id: string;
  projectId: string;
  name: string;
  description: string;
  // "<provider>:<model>", or "" for the project default.
  model: string;
  // Speech provider id ("elevenlabs" | "sarvam"), or "" for whichever the
  // project has connected.
  speech: string;
  // Telephony provider for phone calls ("twilio" | "exotel" | "vobiz"), or "" for
  // whichever the project has connected.
  telephony: string;
  // The number this agent calls from, or "" for the provider's default.
  phoneNumber: string;
  // Answers side questions from the project's knowledge base.
  knowledge: boolean;
  // False while the flow has errors; such an agent cannot take calls.
  ready: boolean;
  stepCount: number;
  updatedAt: string;
}
export interface AgentDetail extends AgentSummary {
  // May be incomplete: an undrawn connection is an empty string.
  flow: DraftFlow;
  layout: NodeLayout;
  issues: FlowIssue[];
  createdAt: string;
}
export interface AgentPatch {
  name?: string;
  description?: string;
  model?: string;
  speech?: string;
  telephony?: string;
  phoneNumber?: string;
  knowledge?: boolean;
  flow?: DraftFlow;
  layout?: NodeLayout;
}

export interface Template {
  flow: Flow;
  issues: FlowIssue[];
}

// browser_*: test calls from the console. api_text: a text conversation run
// over the API. phone: an outbound phone call.
export type Channel = "browser_voice" | "browser_text" | "api_text" | "phone";
// A phone call is queued, then ringing, before anyone is talking.
export type CallStatus = "queued" | "ringing" | "in_progress" | "ended";
export interface Turn {
  id: string;
  index: number;
  callerText: string | null;
  agentText: string;
  interrupted: boolean;
  nodeId: string;
  // Milliseconds from the caller finishing to first LLM text / first audio.
  llmMs: number | null;
  audioMs: number | null;
  createdAt: string;
}
export interface CallListItem {
  id: string;
  projectId: string;
  agentId: string;
  agent: { id: string; name: string };
  channel: Channel;
  model: string;
  variables: Record<string, string>;
  fields: Record<string, FieldValue>;
  // Null while the call is in progress.
  outcome: Outcome | null;
  status: CallStatus;
  // Why a call failed, in words, e.g. "Nobody answered."
  error: string | null;
  // The number dialled, for phone calls.
  to: string | null;
  // "twilio" | "exotel" | "vobiz" for phone calls.
  telephony: string | null;
  // Values the API caller attached to the call, returned in the webhook.
  metadata: Record<string, string>;
  // Set when the agent handed the caller to a person, or tried to.
  handoff: Handoff | null;
  startedAt: string;
  endedAt: string | null;
  turnCount: number;
}
export interface CallDetail extends Omit<CallListItem, "turnCount"> {
  turns: Turn[];
}

export interface ProviderInfo {
  id: string;
  label: string;
  available: boolean;
  // Whose key makes it available: the project's own, or the server's fallback.
  source: "project" | "platform" | null;
  note?: string;
  models: { ref: string; label: string }[];
}
export interface SpeechInfo {
  id: string;
  label: string;
  available: boolean;
  source: "project" | "platform" | null;
  // Whether a default voice is set for it; an agent can still set its own.
  voiceSet: boolean;
}
// What a project can run calls on right now, given the keys it has connected.
export interface Health {
  defaultModel: string;
  // Language-model providers.
  providers: ProviderInfo[];
  speech: SpeechInfo[];
  // Whether any speech provider is connected; without one only text calls work.
  voice: boolean;
  voiceIdSet: boolean;
  // Whether phone calls can be placed: needs a complete telephony provider
  // and a server that providers can reach from the internet.
  phone: {
    ready: boolean;
    providers: string[];
    serverReachable: boolean;
    // The server's public address, "" when it has none.
    publicUrl?: string;
  };
}

// A project's connection to one outside provider. The key itself is never
// sent back; `hint` shows its last four characters.
export interface Credential {
  provider: string;
  label: string;
  kind: "llm" | "speech" | "telephony";
  // Where the owner creates a key with that provider.
  keysUrl: string;
  // What this provider calls its secret, e.g. "Auth token".
  secretLabel: string;
  // Non-secret options saved with the key. Required ones must all be filled
  // before the provider can be used.
  optionFields: {
    name: string;
    label: string;
    hint: string;
    required?: boolean;
    // The only values accepted, when the option is a choice.
    choices?: { value: string; label: string }[];
  }[];
  // Names of required options that are still empty.
  missing: string[];
  // "project": own key saved. "platform": none saved, server fallback in use.
  // null: not connected.
  source: "project" | "platform" | null;
  hint: string | null;
  options: Record<string, string>;
  // Outcome of the last "Test" of the saved key.
  verifiedAt: string | null;
  verifyError: string | null;
  updatedAt: string | null;
}

export interface Handoff {
  to: string;
  // "step": a transfer step in the flow. "requested": the caller asked.
  reason: "step" | "requested";
  // What the person taking over was told.
  summary: string;
  // simulated: a test call, where nobody is dialled.
  status: "connected" | "simulated" | "failed";
  error?: string;
  at: string;
}

// Events the call socket sends. Mirrors apps/api/src/runtime/transport.ts.
export type ServerEvent =
  | { type: "ready"; callId: string }
  | { type: "transcript"; role: "caller"; text: string; final: boolean }
  | { type: "agent_text"; turn: number; delta: string }
  | { type: "agent_audio_end"; turn: number }
  | { type: "clear" }
  | { type: "state"; state: CallState }
  | {
      type: "turn";
      turn: number;
      interrupted: boolean;
      llmMs: number | null;
      audioMs: number | null;
    }
  | { type: "ended"; outcome: Outcome; fields: Record<string, FieldValue> }
  | {
      type: "transfer";
      to: string;
      summary: string;
      status: Handoff["status"];
      error?: string;
    }
  | { type: "error"; message: string };

// First message on the call socket.
export interface StartCallMessage {
  type: "start";
  agentId: string;
  mode: "voice" | "text";
  variables: Record<string, string>;
  model?: string;
}

// ---- Fetching -------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      // Send the session cookie to the API.
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach the API. Is it running on port 4000?", 0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
    throw new ApiError(message ?? `Request failed (${res.status})`, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const get = <T>(path: string) => request<T>("GET", path);

// ---- Session ---------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  // "admin" opens the operator console at /admin.
  role: "user" | "admin";
  createdAt: string;
  // Set while an admin is signed in as this user.
  impersonator: { id: string; name: string; email: string } | null;
}

const SESSION_KEY = "/auth/me";

// The signed-in user: undefined while loading, null when signed out.
export function useSession() {
  const { data, error, isLoading } = useSWR<{ user: User | null }, ApiError>(
    SESSION_KEY,
    get<{ user: User | null }>,
    { shouldRetryOnError: false },
  );
  return { user: data?.user, error, isLoading };
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  company?: string;
  acceptTerms: boolean;
}) {
  const session = await request<{ user: User }>("POST", "/auth/signup", input);
  await mutate(SESSION_KEY, session, false);
  return session.user;
}

export async function login(input: {
  email: string;
  password: string;
  // False ends the session when the browser closes.
  remember?: boolean;
}) {
  const session = await request<{ user: User }>("POST", "/auth/login", input);
  await mutate(SESSION_KEY, session, false);
  return session.user;
}

// Resolves whether or not the address has an account, by design.
export function requestPasswordReset(email: string) {
  return request<void>("POST", "/auth/forgot-password", { email });
}

export function resetPassword(input: { token: string; password: string }) {
  return request<void>("POST", "/auth/reset-password", input);
}

// Changing the email requires currentPassword; name and company do not.
export async function updateProfile(input: {
  name?: string;
  company?: string;
  email?: string;
  currentPassword?: string;
}) {
  const session = await request<{ user: User }>("PATCH", "/auth/me", input);
  await mutate(SESSION_KEY, session, false);
  return session.user;
}

// Signs out every other browser; this one stays signed in.
export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return request<void>("POST", "/auth/change-password", input);
}

// Permanent. Removes the account with all its projects, agents, calls and keys.
export async function deleteAccount(password: string) {
  await request<void>("DELETE", "/auth/me", { password });
  await mutate(() => true, undefined, { revalidate: false });
  await mutate(SESSION_KEY, { user: null }, false);
}

export async function logout() {
  await request<void>("POST", "/auth/logout");
  // Drop everything cached for the previous account.
  await mutate(() => true, undefined, { revalidate: false });
  await mutate(SESSION_KEY, { user: null }, false);
}

// ---- Admin console ----------------------------------------------------------

export interface AdminDay {
  date: string;
  signups?: number;
  calls: number;
  apiRequests: number;
}

export interface AdminOverview {
  users: number;
  admins: number;
  newUsers30d: number;
  // People with a live session of their own (impersonations not counted).
  signedIn: number;
  projects: number;
  agents: number;
  calls: number;
  calls30d: number;
  apiRequests30d: number;
  // The last 30 days, oldest first, every day present.
  byDay: AdminDay[];
}

// Counts cover the projects the user owns.
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  company: string;
  role: User["role"];
  createdAt: string;
  lastLoginAt: string | null;
  projectCount: number;
  agentCount: number;
  callCount: number;
  apiRequests30d: number;
  lastCallAt: string | null;
}

export interface AdminProjectRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  agentCount: number;
  callCount: number;
  apiRequests30d: number;
  lastCallAt: string | null;
}

export interface AdminUserDetail {
  user: Omit<AdminUserRow, "projectCount" | "agentCount" | "callCount" | "apiRequests30d" | "lastCallAt"> & {
    acceptedTermsAt: string | null;
  };
  projects: Omit<AdminProjectRow, "owner">[];
  // Projects someone else owns that this user was added to.
  memberships: {
    id: string;
    name: string;
    role: string;
    createdAt: string;
    owner: { id: string; name: string; email: string } | null;
  }[];
  sessions: {
    id: string;
    createdAt: string;
    expiresAt: string;
    impersonator: { id: string; name: string; email: string } | null;
  }[];
  recentCalls: {
    id: string;
    projectId: string;
    projectName: string;
    agentName: string | null;
    channel: Channel;
    outcome: Outcome | null;
    status: CallStatus;
    startedAt: string;
    endedAt: string | null;
    to: string | null;
  }[];
  usage: {
    calls: number;
    calls30d: number;
    phoneMinutes: number;
    browserVoiceMinutes: number;
    // Agent replies across all calls: roughly, language-model requests.
    turns: number;
    apiRequests30d: number;
    apiErrors30d: number;
    activeApiKeys: number;
    byChannel: Record<string, number>;
    byOutcome: Record<string, number>;
    byDay: AdminDay[];
  };
}

const searchKey = (path: string, q?: string) =>
  q?.trim() ? `${path}?q=${encodeURIComponent(q.trim())}` : path;

export const useAdminOverview = () => useRead<AdminOverview>("/admin/overview");
export const useAdminUsers = (q?: string) =>
  useSWR<AdminUserRow[], ApiError>(searchKey("/admin/users", q), get<AdminUserRow[]>, {
    keepPreviousData: true,
  });
export const useAdminProjects = (q?: string) =>
  useSWR<AdminProjectRow[], ApiError>(searchKey("/admin/projects", q), get<AdminProjectRow[]>, {
    keepPreviousData: true,
  });
export const useAdminUser = (id?: string) =>
  useRead<AdminUserDetail>(id ? `/admin/users/${id}` : null);

export async function setUserRole(id: string, role: User["role"]) {
  await request<void>("PATCH", `/admin/users/${id}`, { role });
  await mutate((key) => typeof key === "string" && key.startsWith("/admin/"));
}

// Signs this browser in as the user, until stopImpersonating(). Everything
// cached belongs to the admin, so it is dropped.
export async function impersonate(id: string) {
  const session = await request<{ user: User }>("POST", `/admin/users/${id}/impersonate`);
  await mutate(() => true, undefined, { revalidate: false });
  await mutate(SESSION_KEY, session, false);
  return session.user;
}

// Puts the admin's own session back. Resolves to the id of the user who was
// being impersonated, to return to their page.
export async function stopImpersonating() {
  const session = await request<{ user: User; impersonated: string | null }>(
    "POST",
    "/auth/stop-impersonating",
  );
  await mutate(() => true, undefined, { revalidate: false });
  await mutate(SESSION_KEY, { user: session.user }, false);
  return session.impersonated;
}

// ---- Read hooks (SWR; the key is the API path) ----------------------------

const useRead = <T>(path: string | null) => useSWR<T, ApiError>(path, get<T>);

export const useProjects = () => useRead<ProjectListItem[]>("/projects");
export const useProject = (id?: string) => useRead<Project>(id ? `/projects/${id}` : null);
export const useProjectStats = (id?: string) =>
  useRead<ProjectStats>(id ? `/projects/${id}/stats` : null);
export const useAgents = (projectId?: string) =>
  useRead<AgentSummary[]>(projectId ? `/projects/${projectId}/agents` : null);
export const useAgent = (id?: string) => useRead<AgentDetail>(id ? `/agents/${id}` : null);
export const useTemplates = () => useRead<Template[]>("/templates");
export const useCalls = (projectId?: string, agentId?: string) =>
  useRead<CallListItem[]>(
    projectId
      ? `/projects/${projectId}/calls${agentId ? `?agentId=${agentId}` : ""}`
      : null,
  );
export const useCall = (id?: string) => useRead<CallDetail>(id ? `/calls/${id}` : null);
// Provider status for a project. Uses the project in the URL when no id is
// passed; on pages outside a project there is nothing to report.
export function useHealth(projectId?: string) {
  const params = useParams<{ projectId?: string }>();
  const id = projectId ?? params?.projectId;
  return useRead<Health>(id ? `/projects/${id}/providers` : null);
}

export const useCredentials = (projectId?: string) =>
  useRead<Credential[]>(projectId ? `/projects/${projectId}/credentials` : null);

const refreshProviders = (projectId: string) =>
  Promise.all([
    mutate(`/projects/${projectId}/credentials`),
    mutate(`/projects/${projectId}/providers`),
  ]);

// Saves or replaces a provider's key. Leave `secret` out to change only the
// options of a key that is already saved.
export async function saveCredential(
  projectId: string,
  provider: string,
  input: { secret?: string; options?: Record<string, string> },
) {
  await request<void>("PUT", `/projects/${projectId}/credentials/${provider}`, input);
  await refreshProviders(projectId);
}

export async function removeCredential(projectId: string, provider: string) {
  await request<void>("DELETE", `/projects/${projectId}/credentials/${provider}`);
  await refreshProviders(projectId);
}

// Tries the saved key against the provider. Free for every provider except
// Sarvam, where it synthesises one short word.
export async function verifyCredential(projectId: string, provider: string) {
  const result = await request<{ ok: boolean; error: string | null }>(
    "POST",
    `/projects/${projectId}/credentials/${provider}/verify`,
  );
  await refreshProviders(projectId);
  return result;
}

// ---- Mutations (each refreshes the lists and items it affects) ------------

export async function createProject(input: { name: string; description?: string }) {
  const project = await request<Project>("POST", "/projects", input);
  await mutate("/projects");
  return project;
}

export async function updateProject(id: string, input: Partial<Pick<Project, "name" | "description">>) {
  const project = await request<Project>("PATCH", `/projects/${id}`, input);
  await Promise.all([mutate("/projects"), mutate(`/projects/${id}`, project, false)]);
  return project;
}

export async function deleteProject(id: string) {
  await request<void>("DELETE", `/projects/${id}`);
  await mutate("/projects");
}

export async function createAgent(
  projectId: string,
  input: { name: string; description?: string; templateId?: string },
) {
  const agent = await request<AgentDetail>("POST", `/projects/${projectId}/agents`, input);
  await Promise.all([mutate(`/projects/${projectId}/agents`), mutate("/projects")]);
  return agent;
}

// Saves part of an agent. The response (with fresh validation issues) replaces
// the cached copy, so every tab showing this agent updates at once.
export async function updateAgent(id: string, patch: AgentPatch) {
  const agent = await request<AgentDetail>("PATCH", `/agents/${id}`, patch);
  await Promise.all([
    mutate(`/agents/${id}`, agent, false),
    mutate(`/projects/${agent.projectId}/agents`),
  ]);
  return agent;
}

export async function deleteAgent(agent: { id: string; projectId: string }) {
  await request<void>("DELETE", `/agents/${agent.id}`);
  await Promise.all([mutate(`/projects/${agent.projectId}/agents`), mutate("/projects")]);
}

// ---- Public API: keys and usage -------------------------------------------

export type ApiKeyStatus = "active" | "expiring" | "expired" | "revoked";

export interface ApiKey {
  id: string;
  name: string;
  // The first characters of the secret followed by an ellipsis.
  prefix: string;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  // Set by a chosen expiry, or by rotation (the old key's grace period).
  expiresAt: string | null;
  revokedAt: string | null;
  rotatedToId: string | null;
}

// Returned once, on create or rotate. The secret cannot be fetched again.
export interface NewApiKey extends ApiKey {
  secret: string;
}

export interface ApiUsageReport {
  days: number;
  requests: number;
  errors: number;
  // Only days that had traffic are present.
  byDay: { date: string; requests: number; errors: number }[];
  byKey: { apiKeyId: string; name: string; prefix: string; requests: number }[];
  byRoute: {
    method: string;
    route: string;
    requests: number;
    errors: number;
    medianMs: number;
  }[];
}

export const API_RATE_LIMIT_PER_MINUTE = 120;

export const useApiKeys = (projectId?: string) =>
  useRead<ApiKey[]>(projectId ? `/projects/${projectId}/api-keys` : null);
export const useApiUsage = (projectId?: string, days = 30) =>
  useRead<ApiUsageReport>(projectId ? `/projects/${projectId}/api-usage?days=${days}` : null);

export async function createApiKey(
  projectId: string,
  input: { name: string; expiresInDays?: number },
) {
  const key = await request<NewApiKey>("POST", `/projects/${projectId}/api-keys`, input);
  await mutate(`/projects/${projectId}/api-keys`);
  return key;
}

// Issues a replacement; the old key keeps working for graceHours (0 to 168).
export async function rotateApiKey(projectId: string, keyId: string, graceHours = 24) {
  const key = await request<NewApiKey>(
    "POST",
    `/projects/${projectId}/api-keys/${keyId}/rotate`,
    { graceHours },
  );
  await mutate(`/projects/${projectId}/api-keys`);
  return key;
}

export async function revokeApiKey(projectId: string, keyId: string) {
  await request<void>("DELETE", `/projects/${projectId}/api-keys/${keyId}`);
  await mutate(`/projects/${projectId}/api-keys`);
}

// ---- Webhooks --------------------------------------------------------------

export const WEBHOOK_EVENTS = ["call.completed"] as const;
export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

// A URL in the customer's system that is told when a call ends.
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEventName[];
  enabled: boolean;
  createdAt: string;
}

// Returned once, on create. The signing secret cannot be fetched again.
export interface NewWebhook extends Webhook {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  // "call.completed", or "ping" for a test.
  event: string;
  // pending: will be retried at nextAttemptAt. failed: gave up after 6 tries.
  status: "pending" | "delivered" | "failed";
  attempts: number;
  nextAttemptAt: string | null;
  // HTTP status the endpoint answered with, if it answered.
  lastStatus: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
  payload: Record<string, unknown>;
}

export const useWebhooks = (projectId?: string) =>
  useRead<Webhook[]>(projectId ? `/projects/${projectId}/webhooks` : null);
export const useWebhookDeliveries = (projectId?: string) =>
  useRead<WebhookDelivery[]>(projectId ? `/projects/${projectId}/webhook-deliveries` : null);

const refreshWebhooks = (projectId: string) =>
  Promise.all([
    mutate(`/projects/${projectId}/webhooks`),
    mutate(`/projects/${projectId}/webhook-deliveries`),
  ]);

export async function createWebhook(projectId: string, input: { url: string }) {
  const webhook = await request<NewWebhook>("POST", `/projects/${projectId}/webhooks`, input);
  await refreshWebhooks(projectId);
  return webhook;
}

export async function setWebhookEnabled(projectId: string, id: string, enabled: boolean) {
  await request<Webhook>("PATCH", `/projects/${projectId}/webhooks/${id}`, { enabled });
  await refreshWebhooks(projectId);
}

export async function deleteWebhook(projectId: string, id: string) {
  await request<void>("DELETE", `/projects/${projectId}/webhooks/${id}`);
  await refreshWebhooks(projectId);
}

// Sends a sample "ping" event and returns how the endpoint responded.
export async function testWebhook(projectId: string, id: string) {
  const delivery = await request<WebhookDelivery>(
    "POST",
    `/projects/${projectId}/webhooks/${id}/test`,
  );
  await refreshWebhooks(projectId);
  return delivery;
}

export async function retryWebhookDelivery(projectId: string, deliveryId: string) {
  const delivery = await request<WebhookDelivery>(
    "POST",
    `/projects/${projectId}/webhook-deliveries/${deliveryId}/retry`,
  );
  await refreshWebhooks(projectId);
  return delivery;
}

// Places a real phone call with an agent. Resolves once it is ringing; watch
// the call record (useCall) for the outcome. Needs a telephony provider and a
// speech provider connected, and a server reachable from the internet.
export async function placePhoneCall(
  agent: { id: string; projectId: string },
  input: { to: string; variables: Record<string, string> },
) {
  const call = await request<CallListItem>("POST", `/agents/${agent.id}/phone-calls`, input);
  await refreshCalls(agent.projectId);
  return call;
}

// Call after a test call ends so call lists and stats pick it up.
export function refreshCalls(projectId: string) {
  return mutate(
    (key) => typeof key === "string" && key.startsWith(`/projects/${projectId}/`) &&
      (key.includes("/calls") || key.endsWith("/stats")),
  );
}

// ---- Team: members, invitations and the audit log --------------------------

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: Exclude<ProjectRole, "owner">;
  expiresAt: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  actorId: string | null;
  // Name and email at the time; "Oxumi" for changes the system made.
  actorLabel: string;
  // A dotted verb, e.g. "agent.updated", "member.invited".
  action: string;
  target: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export const useMembers = (projectId?: string) =>
  useRead<Member[]>(projectId ? `/projects/${projectId}/members` : null);
// Admins and the owner only; others get a 403.
export const useInvites = (projectId?: string, enabled = true) =>
  useRead<Invite[]>(projectId && enabled ? `/projects/${projectId}/invites` : null);
export const useAuditLog = (projectId?: string) =>
  useRead<AuditEvent[]>(projectId ? `/projects/${projectId}/audit` : null);

const refreshTeam = (projectId: string) =>
  Promise.all([
    mutate(`/projects/${projectId}/members`),
    mutate(`/projects/${projectId}/invites`),
    mutate(`/projects/${projectId}/audit`),
  ]);

export async function inviteMember(
  projectId: string,
  input: { email: string; role: Invite["role"] },
) {
  const invite = await request<Invite>("POST", `/projects/${projectId}/invites`, input);
  await refreshTeam(projectId);
  return invite;
}

export async function revokeInvite(projectId: string, inviteId: string) {
  await request<void>("DELETE", `/projects/${projectId}/invites/${inviteId}`);
  await refreshTeam(projectId);
}

export async function setMemberRole(projectId: string, userId: string, role: Invite["role"]) {
  await request<Member>("PATCH", `/projects/${projectId}/members/${userId}`, { role });
  await refreshTeam(projectId);
}

// Removes someone; with the signed-in user's own id, leaves the project.
export async function removeMember(projectId: string, userId: string) {
  await request<void>("DELETE", `/projects/${projectId}/members/${userId}`);
  await refreshTeam(projectId);
  await mutate("/projects");
}

export const previewInvite = (token: string) =>
  request<{ projectName: string; email: string; role: ProjectRole }>(
    "GET",
    `/invites/${encodeURIComponent(token)}`,
  );

export async function acceptInvite(token: string) {
  const result = await request<{ projectId: string }>(
    "POST",
    `/invites/${encodeURIComponent(token)}/accept`,
  );
  await mutate("/projects");
  return result;
}

// ---- Compliance -------------------------------------------------------------

export interface CallingHours {
  enabled: boolean;
  // "HH:MM" in the project's time zone; end is exclusive.
  start: string;
  end: string;
  // 0 is Sunday.
  days: number[];
}

export interface ComplianceSettings {
  timezone: string;
  callingHours: CallingHours;
  // Spoken before the flow's opening on every call.
  disclosure: string;
  // Phone calls only go to numbers with recorded consent.
  requireConsent: boolean;
  // Callers who opt out on a call are added to the do-not-call list.
  honourOptOuts: boolean;
}

export interface DoNotCallEntry {
  id: string;
  number: string;
  reason: "opted_out" | "manual" | "imported";
  note: string;
  callId: string | null;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  number: string;
  given: boolean;
  source: string;
  note: string;
  capturedAt: string;
  createdAt: string;
}

export interface ComplianceBlock {
  code: "do_not_call" | "outside_hours" | "no_consent";
  message: string;
}

export const useCompliance = (projectId?: string) =>
  useRead<ComplianceSettings>(projectId ? `/projects/${projectId}/compliance` : null);
export const useDoNotCall = (projectId?: string, search = "") =>
  useRead<DoNotCallEntry[]>(
    projectId
      ? `/projects/${projectId}/do-not-call${search ? `?search=${encodeURIComponent(search)}` : ""}`
      : null,
  );
export const useConsents = (projectId?: string) =>
  useRead<ConsentRecord[]>(projectId ? `/projects/${projectId}/consents` : null);

const refreshCompliance = (projectId: string) =>
  mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith(`/projects/${projectId}/compliance`) ||
        key.startsWith(`/projects/${projectId}/do-not-call`) ||
        key.startsWith(`/projects/${projectId}/consents`) ||
        key === `/projects/${projectId}/audit`),
  );

export async function updateCompliance(projectId: string, input: Partial<ComplianceSettings>) {
  const settings = await request<ComplianceSettings>("PUT", `/projects/${projectId}/compliance`, input);
  await refreshCompliance(projectId);
  return settings;
}

// One number, or several separated by new lines or commas.
export async function addDoNotCall(projectId: string, numbers: string, note = "") {
  const result = await request<{ added: number; invalid: string[] }>(
    "POST",
    `/projects/${projectId}/do-not-call`,
    { numbers, note },
  );
  await refreshCompliance(projectId);
  return result;
}

export async function removeDoNotCall(projectId: string, number: string) {
  await request<void>("DELETE", `/projects/${projectId}/do-not-call/${encodeURIComponent(number)}`);
  await refreshCompliance(projectId);
}

export async function recordConsent(
  projectId: string,
  input: { number: string; given: boolean; source?: string; note?: string; capturedAt?: string },
) {
  const record = await request<ConsentRecord>("POST", `/projects/${projectId}/consents`, input);
  await refreshCompliance(projectId);
  return record;
}

export const checkNumber = (projectId: string, number: string) =>
  request<{ number: string; allowed: boolean; blocks: ComplianceBlock[] }>(
    "POST",
    `/projects/${projectId}/compliance/check`,
    { number },
  );

// ---- Billing ----------------------------------------------------------------

export interface SpendLimit {
  // In the billing currency; null for no limit.
  monthlyCap: number | null;
  alertPercent: number;
  // Share of the cap spent this month; null without a cap.
  used: number | null;
  reached: boolean;
}

export interface BillingReport {
  // "YYYY-MM", UTC.
  month: string;
  currency: string;
  rates: { phonePerMinute: number; browserVoicePerMinute: number; textPerCall: number };
  total: number;
  calls: number;
  minutes: number;
  byDay: { date: string; cost: number; calls: number }[];
  byChannel: { channel: Channel; cost: number; calls: number; minutes: number }[];
  byAgent: { agentId: string; agentName: string; cost: number; calls: number; minutes: number }[];
  limit: SpendLimit;
}

export const useBilling = (projectId?: string, month?: string) =>
  useRead<BillingReport>(
    projectId ? `/projects/${projectId}/billing${month ? `?month=${month}` : ""}` : null,
  );

export async function updateSpendLimit(
  projectId: string,
  input: { monthlyCap?: number | null; alertPercent?: number },
) {
  const limit = await request<SpendLimit>("PUT", `/projects/${projectId}/billing/limit`, input);
  await mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith(`/projects/${projectId}/billing`) || key === `/projects/${projectId}/audit`),
  );
  return limit;
}

// ---- Knowledge base ----------------------------------------------------------

export interface KnowledgeSource {
  id: string;
  title: string;
  kind: "text" | "url";
  url: string | null;
  status: "ready" | "failed";
  error: string | null;
  characters: number;
  // Passages the source was cut into.
  chunks: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeHit {
  sourceId: string;
  title: string;
  content: string;
  rank: number;
}

export const useKnowledge = (projectId?: string) =>
  useRead<KnowledgeSource[]>(projectId ? `/projects/${projectId}/knowledge` : null);

const refreshKnowledge = (projectId: string) =>
  Promise.all([mutate(`/projects/${projectId}/knowledge`), mutate(`/projects/${projectId}/audit`)]);

// Pasted text: { title, text }. A web page: { url, title? }.
export async function addKnowledge(
  projectId: string,
  input: { title?: string; text?: string; url?: string },
) {
  const source = await request<KnowledgeSource>("POST", `/projects/${projectId}/knowledge`, input);
  await refreshKnowledge(projectId);
  return source;
}

export async function refreshKnowledgeSource(projectId: string, sourceId: string) {
  const source = await request<KnowledgeSource>(
    "POST",
    `/projects/${projectId}/knowledge/${sourceId}/refresh`,
  );
  await refreshKnowledge(projectId);
  return source;
}

export async function removeKnowledge(projectId: string, sourceId: string) {
  await request<void>("DELETE", `/projects/${projectId}/knowledge/${sourceId}`);
  await refreshKnowledge(projectId);
}

// The passages an agent would be handed for a question.
export const searchKnowledge = (projectId: string, question: string) =>
  request<KnowledgeHit[]>("POST", `/projects/${projectId}/knowledge/search`, { question });

// ---- AI flow builder -------------------------------------------------------

// A flow written by the project's language model. Nothing is saved until it
// is applied with updateAgent.
export interface FlowProposal {
  flow: DraftFlow;
  issues: FlowIssue[];
  // What the model built or changed, in its own words.
  summary: string;
  // False when errors remained after the model's attempts to fix them.
  valid: boolean;
  // "<provider>:<model>" that wrote it.
  model: string;
}

// With agentId, rewrites that agent's flow; with flow, refines a proposal;
// with neither, writes a new flow. Takes 10 to 60 seconds.
export function generateFlow(
  projectId: string,
  input: { prompt: string; agentId?: string; flow?: DraftFlow; name?: string },
) {
  return request<FlowProposal>("POST", `/projects/${projectId}/flow-ai/generate`, input);
}
