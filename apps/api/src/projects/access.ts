// Who may do what in a project. Each role can do everything the roles below
// it can:
// - viewer: read agents, calls, results, settings and logs.
// - editor: build and change agents, place test and phone calls, manage the
//   knowledge base.
// - admin: provider keys, API keys, webhooks, compliance rules, spend limits
//   and members.
// - owner: the person who created the project; can also delete it.
export const ROLES = ["viewer", "editor", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

// The roles a member can be given; there is exactly one owner.
export const ASSIGNABLE_ROLES = ["viewer", "editor", "admin"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function atLeast(role: Role, need: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(need);
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.includes(value as AssignableRole);
}
