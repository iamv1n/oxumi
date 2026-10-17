import type { ReactNode } from "react";
import { formatMoney } from "@/components/app/billing/format";
import type { AuditEvent } from "@/lib/api";
import { roleLabel } from "./roles";

// Turns an audit event into the rest of a sentence that starts with who did
// it: "invited ana@example.com as editor". Unknown actions fall back to the
// raw action name, so a new kind of event still shows up.

// Friendlier names for the fields an agent update or compliance change lists.
const FIELD: Record<string, string> = {
  name: "name",
  description: "description",
  model: "model",
  speech: "voice",
  telephony: "phone provider",
  phoneNumber: "phone number",
  knowledge: "knowledge",
  flow: "flow",
  timezone: "time zone",
  callingHours: "calling hours",
  disclosure: "disclosure",
  requireConsent: "consent rule",
  honourOptOuts: "opt-out rule",
};

const field = (key: string) =>
  FIELD[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

// "a, b and c".
function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

type Limit = { monthlyCap: number | null; alertPercent: number };

function limitChange(before?: Limit, after?: Limit): string {
  if (!after) return "changed the spend limit";
  const parts: string[] = [];
  if (before?.monthlyCap !== after.monthlyCap)
    parts.push(
      after.monthlyCap === null
        ? "removed the monthly spend limit"
        : `set the monthly spend limit to ${formatMoney(after.monthlyCap)}`,
    );
  if (before?.alertPercent !== after.alertPercent)
    parts.push(`set the spend alert to ${after.alertPercent}%`);
  return parts.length ? list(parts) : "saved the spend limit unchanged";
}

export function describe(event: AuditEvent): ReactNode {
  const t = <b>{event.target}</b>;
  const d = event.details ?? {};
  const role = typeof d.role === "string" ? roleLabel(d.role).toLowerCase() : null;

  switch (event.action) {
    case "project.updated": {
      const before = d.before as { name?: string } | undefined;
      const after = d.after as { name?: string } | undefined;
      return before?.name && after?.name && before.name !== after.name ? (
        <>
          renamed the project from <b>{before.name}</b> to <b>{after.name}</b>
        </>
      ) : (
        "updated the project details"
      );
    }
    case "member.invited":
      return <>invited {t}{role && ` as ${role}`}</>;
    case "member.invite_revoked":
      return <>revoked the invitation to {t}</>;
    case "member.joined":
      return `joined the project${role ? ` as ${role}` : ""}`;
    case "member.left":
      return "left the project";
    case "member.removed":
      return <>removed {t} from the project</>;
    case "member.role_changed":
      return (
        <>
          changed {t}&apos;s role from {roleLabel(String(d.before)).toLowerCase()} to{" "}
          {roleLabel(String(d.after)).toLowerCase()}
        </>
      );
    case "agent.created":
      return <>created the agent {t}</>;
    case "agent.updated": {
      const changed = Array.isArray(d.changed) ? (d.changed as string[]).map(field) : [];
      return (
        <>
          updated {t}
          {changed.length > 0 && ` (${list(changed)})`}
        </>
      );
    }
    case "agent.deleted":
      return <>deleted the agent {t}</>;
    case "credential.saved":
      return <>saved the {t} credentials</>;
    case "credential.removed":
      return <>removed the {t} credentials</>;
    case "api_key.created":
      return <>created the API key {t}</>;
    case "api_key.rotated":
      return <>rotated the API key {t}</>;
    case "api_key.revoked":
      return <>revoked the API key {t}</>;
    case "webhook.created":
      return <>added a webhook to {t}</>;
    case "webhook.enabled":
      return <>resumed the webhook to {t}</>;
    case "webhook.paused":
      return <>paused the webhook to {t}</>;
    case "webhook.deleted":
      return <>deleted the webhook to {t}</>;
    case "compliance.updated": {
      const keys = event.target ? event.target.split(", ").map(field) : [];
      return `changed compliance settings${keys.length ? ` (${list(keys)})` : ""}`;
    }
    case "dnc.added":
      return <>added {t} to the do-not-call list</>;
    case "dnc.removed":
      return <>removed {t} from the do-not-call list</>;
    case "dnc.opted_out":
      return <>added {t} to the do-not-call list after they opted out on a call</>;
    case "consent.given":
      return <>recorded consent from {t}</>;
    case "consent.withdrawn":
      return <>recorded that {t} withdrew consent</>;
    case "billing.limit_changed":
      return limitChange(d.before as Limit | undefined, d.after as Limit | undefined);
    case "billing.alert_sent":
      return <>emailed the admins: spending reached {t}</>;
    case "knowledge.added":
      return <>added {t} to the knowledge base</>;
    case "knowledge.refreshed":
      return <>refreshed {t} in the knowledge base</>;
    case "knowledge.removed":
      return <>removed {t} from the knowledge base</>;
    default:
      return (
        <>
          <code>{event.action}</code>
          {event.target && <> {t}</>}
        </>
      );
  }
}

// The actor's name alone, from labels like "Ana (ana@example.com)" or
// "Ana (ana@example.com) via ops@example.com".
export function actorName(label: string): string {
  if (!label) return "Someone";
  const paren = label.indexOf(" (");
  return paren > 0 ? label.slice(0, paren) : label;
}
