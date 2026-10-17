import { createHmac } from "node:crypto";

// How a receiver checks a delivery really came from us: recompute this over
// "<timestamp>.<raw body>" with the endpoint's secret and compare.
export function sign(secret: string, timestamp: number, body: string): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}
