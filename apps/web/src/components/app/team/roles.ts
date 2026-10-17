import type { Invite, Member, ProjectRole } from "@/lib/api";

// What each role may do, in the words the Team page uses.
export const ROLE: Record<ProjectRole, { label: string; description: string }> = {
  viewer: { label: "Viewer", description: "Can see agents, calls and settings, but not change them." },
  editor: { label: "Editor", description: "Builds agents, places calls and manages knowledge." },
  admin: {
    label: "Admin",
    description: "Also manages provider keys, API keys, webhooks, compliance, spend limits and members.",
  },
  owner: { label: "Owner", description: "Everything, including deleting the project." },
};

export const roleLabel = (role: string) => ROLE[role as ProjectRole]?.label ?? role;

// The roles someone may hand out: admins invite and manage editors and
// viewers; only the owner can make an admin.
export function assignableRoles(myRole: ProjectRole | undefined): Invite["role"][] {
  if (myRole === "owner") return ["viewer", "editor", "admin"];
  if (myRole === "admin") return ["viewer", "editor"];
  return [];
}

// Whether the signed-in person may change or remove another member. The
// owner is never managed, and admins are managed by the owner only.
export function canManage(myRole: ProjectRole | undefined, member: Member, myId?: string) {
  if (member.userId === myId || member.role === "owner") return false;
  if (myRole === "owner") return true;
  return myRole === "admin" && (member.role === "viewer" || member.role === "editor");
}
