"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import {
  type ApiKey,
  type ApiUsageReport,
  type Webhook,
  type WebhookDelivery,
} from "@/lib/api";
import { DELIVERY } from "./delivery";
import { fullDate, relativeTime } from "./format";
import { State } from "./ui";

// The state of the project's API at a glance, above every view: what is
// switched on, and how the last week went.

const Strip = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  > div {
    min-width: 0;
    margin: -1px 0 0 -1px;
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
  /* Five cells in two columns would leave a hole, so the last spans both. */
  > .last {
    grid-column: 1 / -1;
  }
  dt {
    ${type("overline")}
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  dd {
    ${type("label")}
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    min-height: ${({ theme }) => theme.space(6)};
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  dd code {
    ${type("code")}
    overflow: hidden;
    text-overflow: ellipsis;
  }
  dd small {
    ${type("caption")}
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
  }
  dd .bad {
    color: ${({ theme }) => theme.color.danger};
  }

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(5, minmax(0, 1fr));

    > .last {
      grid-column: auto;
    }
  }
`;

const dash = "—";

export function ApiSummary({
  keys,
  webhooks,
  deliveries,
  week,
}: {
  // Each is undefined until it has loaded.
  keys?: ApiKey[];
  webhooks?: Webhook[];
  deliveries?: WebhookDelivery[];
  // Usage for the last seven days.
  week?: ApiUsageReport;
}) {
  const working = keys?.filter((key) => key.status === "active" || key.status === "expiring");
  const expiring = keys?.filter((key) => key.status === "expiring").length ?? 0;
  const enabled = webhooks?.filter((webhook) => webhook.enabled).length;
  const today = new Date().toISOString().slice(0, 10);
  const requestsToday = week?.byDay.find((day) => day.date === today)?.requests ?? 0;
  const errorRate = week && week.requests > 0 ? (week.errors / week.requests) * 100 : null;
  const last = deliveries?.length
    ? deliveries.reduce((a, b) => (+new Date(b.createdAt) > +new Date(a.createdAt) ? b : a))
    : undefined;

  return (
    <Strip data-tour="api-summary" aria-label="API at a glance">
      <div>
        <dt>Keys</dt>
        <dd>
          {working ? working.length : dash}
          {working && <small>{expiring > 0 ? `working · ${expiring} expiring` : "working"}</small>}
        </dd>
      </div>
      <div>
        <dt>Webhooks</dt>
        <dd>
          {enabled ?? dash}
          {webhooks && (
            <small>
              {webhooks.length === 0
                ? "none yet"
                : enabled === webhooks.length
                  ? "enabled"
                  : `of ${webhooks.length} enabled`}
            </small>
          )}
        </dd>
      </div>
      <div>
        <dt>Requests 7d</dt>
        <dd>
          {week ? week.requests.toLocaleString() : dash}
          {week && <small>{requestsToday.toLocaleString()} today</small>}
        </dd>
      </div>
      <div>
        <dt>Errors 7d</dt>
        <dd>
          {week ? (
            errorRate === null ? (
              <small>no requests</small>
            ) : (
              <>
                <span className={errorRate >= 5 ? "bad" : undefined}>
                  {errorRate.toFixed(errorRate < 10 ? 1 : 0)}%
                </span>
                <small>{week.errors.toLocaleString()}</small>
              </>
            )
          ) : (
            dash
          )}
        </dd>
      </div>
      <div className="last">
        <dt>Last delivery</dt>
        <dd>
          {deliveries ? (
            last ? (
              <>
                <State $tone={DELIVERY[last.status].tone}>{DELIVERY[last.status].label}</State>
                <small title={fullDate(last.createdAt)}>{relativeTime(last.createdAt)}</small>
              </>
            ) : (
              <small>none yet</small>
            )
          ) : (
            dash
          )}
        </dd>
      </div>
    </Strip>
  );
}
