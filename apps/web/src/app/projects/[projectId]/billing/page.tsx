"use client";

import { Select, Skeleton } from "antd";
import { useParams } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { AgentTable, ChannelTable } from "@/components/app/billing/Breakdown";
import {
  currentMonth,
  formatMoney,
  monthLabel,
  recentMonths,
} from "@/components/app/billing/format";
import { SpendChart } from "@/components/app/billing/SpendChart";
import { SpendLimitCard } from "@/components/app/billing/SpendLimitCard";
import { Page, PageHeader, Panel, Stat } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { atLeast, useBilling, useProject } from "@/lib/api";

const Sections = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
`;

const Stats = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Tables = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  align-items: start;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
`;

const Prices = styled.div`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  h2 {
    ${type("label")}
    margin-bottom: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(5)};
    margin-bottom: ${({ theme }) => theme.space(1)};
  }
  b {
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`;

// Twelve months is plenty to look back on; the current one comes first.
const MONTHS = 12;

export default function BillingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const [month, setMonth] = useState(() => currentMonth());
  const isCurrent = month === currentMonth();
  // The current month is asked for without a month, so its cache entry is
  // the one the spend limit form refreshes.
  const billing = useBilling(projectId, isCurrent ? undefined : month);
  const report = billing.data;
  const canEdit = atLeast(project?.role, "admin");

  const switcher = (
    <Select
      value={month}
      onChange={setMonth}
      aria-label="Month"
      style={{ minWidth: 170 }}
      options={recentMonths(MONTHS).map((value, i) => ({
        value,
        label: i === 0 ? `${monthLabel(value)} (this month)` : monthLabel(value),
      }))}
    />
  );

  return (
    <Page>
      <PageHeader
        title="Billing"
        description="What this project's calls cost at list prices, and a monthly limit to cap spend."
        actions={switcher}
      />
      {billing.error && !report ? (
        <LoadError
          title={
            billing.error.status === 403
              ? "You cannot see this project's billing"
              : "Billing could not be loaded"
          }
          error={billing.error}
          onRetry={() => void billing.mutate()}
        />
      ) : !report ? (
        <Sections aria-busy aria-label="Loading billing">
          <Stats>
            {[0, 1, 2].map((i) => (
              <Panel key={i}>
                <Skeleton active title={false} paragraph={{ rows: 2 }} />
              </Panel>
            ))}
          </Stats>
          <Panel>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Panel>
        </Sections>
      ) : (
        <Sections>
          <Stats>
            <Stat
              label={isCurrent ? "Spend this month" : `Spend in ${monthLabel(report.month)}`}
              value={formatMoney(report.total, report.currency)}
              hint="At list prices"
            />
            <Stat label="Calls" value={report.calls.toLocaleString()} hint="Including free ones" />
            <Stat
              label="Billable minutes"
              value={report.minutes.toLocaleString()}
              hint="Voice calls, per started minute"
            />
          </Stats>
          <SpendLimitCard
            projectId={projectId}
            limit={report.limit}
            spent={isCurrent ? report.total : null}
            canEdit={canEdit}
          />
          <Panel>
            <SpendChart days={report.byDay} />
          </Panel>
          <Tables>
            <ChannelTable rows={report.byChannel} />
            <AgentTable rows={report.byAgent} projectId={projectId} />
          </Tables>
          <Prices>
            <h2>List prices</h2>
            <ul>
              <li>
                Phone <b>{formatMoney(report.rates.phonePerMinute, report.currency)}</b> per minute
              </li>
              <li>
                Browser voice{" "}
                <b>{formatMoney(report.rates.browserVoicePerMinute, report.currency)}</b> per
                minute
              </li>
              <li>
                Text <b>{formatMoney(report.rates.textPerCall, report.currency)}</b> per call
              </li>
            </ul>
            <p>
              Voice calls are charged per started minute and text calls per call. Calls where
              nobody spoke are free. These are placeholder prices, not an invoice.
            </p>
          </Prices>
        </Sections>
      )}
    </Page>
  );
}
