"use client";

import type { WebhookDelivery } from "@/lib/api";
import { State, type Tone } from "./ui";

// How a webhook delivery's state is worded and coloured, wherever it shows.

export const DELIVERY: Record<WebhookDelivery["status"], { label: string; tone: Tone }> = {
  delivered: { label: "Delivered", tone: "ok" },
  pending: { label: "Retrying", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
};

// What the endpoint said: its HTTP status, or why it could not be reached.
export function response(delivery: WebhookDelivery): string {
  if (delivery.lastStatus !== null) return `HTTP ${delivery.lastStatus}`;
  return delivery.lastError ?? (delivery.attempts === 0 ? "Not sent yet" : "No response");
}

export function DeliveryState({ delivery }: { delivery: WebhookDelivery }) {
  const look = DELIVERY[delivery.status];
  return <State $tone={look.tone}>{look.label}</State>;
}
