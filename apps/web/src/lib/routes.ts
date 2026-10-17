// The public site (home page, docs, terms, privacy) is a separate deployment:
// apps/site. NEXT_PUBLIC_SITE_URL is its address, e.g. https://example.com.
// In development it defaults to the site's dev server. A production build of
// the app needs it set: without it these links stay on the app, which has no
// such pages (next.config.ts warns at build time).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000")
).replace(/\/+$/, "");

// Every URL the app links to, in one place.
export const routes = {
  // On the public site.
  home: `${SITE_URL}/`,
  terms: `${SITE_URL}/terms`,
  privacy: `${SITE_URL}/privacy`,
  // The API docs: docs() is their first page, docs("webhooks") a page in them.
  docs: (page?: string) => `${SITE_URL}/docs${page ? `/${page}` : ""}`,
  // In the app.
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  projects: "/projects",
  account: "/account",
  // The operator console; admins only.
  admin: "/admin",
  adminProjects: "/admin/projects",
  adminUser: (userId: string) => `/admin/users/${userId}`,
  project: (projectId: string) => `/projects/${projectId}`,
  agents: (projectId: string) => `/projects/${projectId}/agents`,
  calls: (projectId: string) => `/projects/${projectId}/calls`,
  call: (projectId: string, callId: string) =>
    `/projects/${projectId}/calls/${callId}`,
  settings: (projectId: string) => `/projects/${projectId}/settings`,
  projectApi: (projectId: string) => `/projects/${projectId}/api`,
  integrations: (projectId: string) => `/projects/${projectId}/integrations`,
  knowledge: (projectId: string) => `/projects/${projectId}/knowledge`,
  compliance: (projectId: string) => `/projects/${projectId}/compliance`,
  team: (projectId: string) => `/projects/${projectId}/team`,
  billing: (projectId: string) => `/projects/${projectId}/billing`,
  // Opened from an invitation email.
  invite: (token: string) => `/invite?token=${encodeURIComponent(token)}`,
  // An agent's pages. The flow builder is the agent's landing tab.
  agent: (projectId: string, agentId: string) =>
    `/projects/${projectId}/agents/${agentId}`,
  agentConfig: (projectId: string, agentId: string) =>
    `/projects/${projectId}/agents/${agentId}/config`,
  agentData: (projectId: string, agentId: string) =>
    `/projects/${projectId}/agents/${agentId}/data`,
  agentTest: (projectId: string, agentId: string) =>
    `/projects/${projectId}/agents/${agentId}/test`,
  agentCalls: (projectId: string, agentId: string) =>
    `/projects/${projectId}/agents/${agentId}/calls`,
} as const;
