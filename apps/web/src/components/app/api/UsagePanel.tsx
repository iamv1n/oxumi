"use client";

import { ArrowDownOutlined, ArrowUpOutlined, BarChartOutlined } from "@ant-design/icons";
import { Button, Segmented, Skeleton } from "antd";
import { type KeyboardEvent, useMemo, useState } from "react";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { type } from "@oxumi/ui/design/typography";
import { API_RATE_LIMIT_PER_MINUTE, type ApiUsageReport, useApiUsage } from "@/lib/api";
import { Box, BoxBody, BoxHead, EmptyState, Quiet, ViewHeader } from "./ui";

type Range = 7 | 30 | 90;
type Day = { date: string; requests: number; errors: number };

const DAY_MS = 86_400_000;

// The report lists only days with traffic; the chart needs every day.
function fillDays(report: ApiUsageReport, range: Range): Day[] {
  const byDate = new Map(report.byDay.map((day) => [day.date, day]));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: range }, (_, i) => {
    const date = new Date(today - (range - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    return byDate.get(date) ?? { date, requests: 0, errors: 0 };
  });
}

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const rate = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const percent = (value: number) => `${value.toFixed(value > 0 && value < 10 ? 1 : 0)}%`;
const count = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

// A round number at or above `value`, for the top of the axis.
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

// ---- Headline numbers -----------------------------------------------------

const Strip = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  > div {
    min-width: 0;
    margin: -1px 0 0 -1px;
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
  dt {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(0.5)};
  }
  strong {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Trend = styled.span<{ $tone: "good" | "bad" | "flat" }>`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  flex-basis: 100%;
  color: ${({ theme, $tone }) =>
    $tone === "good"
      ? theme.color.success
      : $tone === "bad"
        ? theme.color.danger
        : theme.color.fgSubtle};
  font-variant-numeric: tabular-nums;

  .anticon {
    font-size: 10px;
  }
`;

// ---- Chart ----------------------------------------------------------------

const Legend = styled.ul`
  ${type("caption")}
  display: flex;
  margin-left: auto;
  gap: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};

  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
  }
  i {
    width: ${({ theme }) => theme.space(2)};
    height: ${({ theme }) => theme.space(2)};
    border-radius: 2px;
    background: ${({ theme }) => theme.color.fgSubtle};
  }
  li:last-child i {
    background: ${({ theme }) => theme.color.danger};
  }
`;

const Readout = styled.p`
  ${type("caption")}
  /* Its own line under the title on phones, beside it from sm up. */
  order: 3;
  flex-basis: 100%;
  margin-right: auto;
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;

  b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }

  ${({ theme }) => theme.media.sm} {
    order: 0;
    flex-basis: auto;
  }
`;

const PLOT_HEIGHT = 168;

const Plot = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0 ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(3)};

  .y {
    ${type("caption")}
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: ${PLOT_HEIGHT}px;
    /* Centre each label on its gridline. */
    margin-block: -0.5em;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`;

const Bars = styled.div<{ $count: number }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  height: ${PLOT_HEIGHT}px;
  border-bottom: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: 2px;
  /* Gridlines at the top and at half height. */
  background:
    linear-gradient(${({ theme }) => theme.color.line}, ${({ theme }) => theme.color.line}) top /
      100% 1px no-repeat,
    linear-gradient(${({ theme }) => theme.color.line}, ${({ theme }) => theme.color.line}) center /
      100% 1px no-repeat;
  cursor: crosshair;

  &:focus-visible {
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }
`;

const Column = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 1px;
  height: 100%;
  padding-inline: 12%;
  background: ${({ theme, $active }) => ($active ? theme.color.hover : "transparent")};

  span {
    width: 100%;
    max-width: ${({ theme }) => theme.space(8)};
    min-height: 2px;
    background: ${({ theme, $active }) => ($active ? theme.color.fgMuted : theme.color.fgSubtle)};
  }
  span:first-child {
    border-radius: 2px 2px 0 0;
  }
  span.error {
    background: ${({ theme }) => theme.color.danger};
  }
  /* A day without traffic still has a mark, so gaps read as zero. */
  span.none {
    min-height: 1px;
    height: 1px;
    background: ${({ theme }) => theme.color.lineStrong};
  }
`;

const XAxis = styled.div<{ $count: number }>`
  ${type("caption")}
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  margin-top: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};

  span {
    grid-row: 1;
    justify-self: center;
    white-space: nowrap;
  }
  span:first-child {
    justify-self: start;
  }
  span:last-child {
    justify-self: end;
  }
  /* Phones have room for the two ends only. */
  span:not(:first-child):not(:last-child) {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    span:not(:first-child):not(:last-child) {
      display: inline;
    }
  }
`;

function DayChart({ days }: { days: Day[] }) {
  const peak = Math.max(...days.map((day) => day.requests));
  const max = niceMax(peak);
  // The day being inspected; the latest day until one is chosen.
  const [picked, setPicked] = useState<number | null>(null);
  const active = Math.min(picked ?? days.length - 1, days.length - 1);
  const day = days[active]!;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: days.length - 1,
    };
    const next = move[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setPicked(Math.min(days.length - 1, Math.max(0, next)));
  };

  // Label every day of a week; otherwise about five evenly spaced days.
  const every = days.length <= 7 ? 1 : Math.ceil(days.length / 5);
  const ticks = days
    .map((d, i) => ({ i, text: i === days.length - 1 ? "Today" : dayLabel(d.date) }))
    .filter(({ i }) => i === days.length - 1 || (i % every === 0 && days.length - 1 - i >= every / 2));

  return (
    <>
      <BoxHead>
        <h3>Requests per day</h3>
        <Readout role="status">
          <b>{active === days.length - 1 ? "Today" : dayLabel(day.date)}</b> ·{" "}
          {count(day.requests, "request")}
          {day.requests > 0 && (
            <>
              {" "}
              · {count(day.errors, "error")} ({percent(rate(day.errors, day.requests))})
            </>
          )}
        </Readout>
        <Legend aria-label="Legend">
          <li>
            <i /> Succeeded
          </li>
          <li>
            <i /> Errors
          </li>
        </Legend>
      </BoxHead>
      <Plot>
        <div className="y" aria-hidden>
          <span>{max.toLocaleString()}</span>
          <span>{(max / 2).toLocaleString()}</span>
          <span>0</span>
        </div>
        <Bars
          $count={days.length}
          tabIndex={0}
          role="group"
          aria-label={`Requests per day for the last ${days.length} days. Use the left and right arrow keys to read each day.`}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setPicked(null)}
        >
          {days.map((d, i) => (
            <Column key={d.date} $active={i === active} onMouseEnter={() => setPicked(i)}>
              {d.requests === 0 ? (
                <span className="none" />
              ) : (
                <>
                  {d.errors > 0 && (
                    <span className="error" style={{ height: `${(d.errors / max) * 100}%` }} />
                  )}
                  {d.requests > d.errors && (
                    <span style={{ height: `${((d.requests - d.errors) / max) * 100}%` }} />
                  )}
                </>
              )}
            </Column>
          ))}
        </Bars>
        <XAxis $count={days.length} aria-hidden>
          {ticks.map(({ i, text }) => (
            <span key={i} style={{ gridColumn: i + 1 }}>
              {text}
            </span>
          ))}
        </XAxis>
      </Plot>
    </>
  );
}

// ---- Breakdowns -----------------------------------------------------------

const Tables = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  align-items: start;
  margin-top: ${({ theme }) => theme.space(3)};

`;

const Ranked = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    ${type("overline")}
    height: ${({ theme }) => theme.space(8)};
    padding: 0 ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgSubtle};
    text-align: left;
    white-space: nowrap;
  }
  td {
    ${type("label")}
    position: relative;
    height: ${({ theme }) => theme.space(9)};
    padding: 0 ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
    white-space: nowrap;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  th:first-child,
  td:first-child {
    padding-left: ${({ theme }) => theme.space(4)};
  }
  th:last-child,
  td:last-child {
    padding-right: ${({ theme }) => theme.space(4)};
  }
  .num {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .strong {
    color: ${({ theme }) => theme.color.fg};
  }
  .bad {
    color: ${({ theme }) => theme.color.danger};
  }
  code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
  }
  .name {
    margin-right: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  .prefix {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .what {
    max-width: 0;
    width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The row's share of all requests, drawn along its bottom edge. */
  .what::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -1px;
    width: var(--share);
    height: 2px;
    background: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Scroll = styled.div`
  overflow-x: auto;
`;

export function UsagePanel({
  projectId,
  onTab,
}: {
  projectId: string;
  onTab?: (tab: "start") => void;
}) {
  const [range, setRange] = useState<Range>(30);
  const usage = useApiUsage(projectId, range);
  const days = useMemo(() => (usage.data ? fillDays(usage.data, range) : []), [usage.data, range]);

  const header = (
    <ViewHeader
      title="Usage"
      actions={
        <Segmented<Range>
          size="small"
          value={range}
          onChange={setRange}
          aria-label="Time range"
          data-tour="api-usage-range"
          options={[
            { value: 7, label: "7 days" },
            { value: 30, label: "30 days" },
            { value: 90, label: "90 days" },
          ]}
        />
      }
    >
      Requests made with this project&apos;s keys. Each key may make up to{" "}
      <b>{API_RATE_LIMIT_PER_MINUTE} requests per minute</b>; beyond that the API answers 429 and
      says when to try again.
    </ViewHeader>
  );

  if (usage.error && !usage.data)
    return (
      <>
        {header}
        <LoadError
          title="Usage could not be loaded"
          error={usage.error}
          onRetry={() => usage.mutate()}
        />
      </>
    );
  if (!usage.data)
    return (
      <>
        {header}
        <Box aria-busy="true" aria-label="Loading usage">
          <BoxBody>
            <Skeleton active paragraph={{ rows: 6 }} />
          </BoxBody>
        </Box>
      </>
    );

  const report = usage.data;
  if (report.requests === 0)
    return (
      <>
        {header}
        <EmptyState
          icon={<BarChartOutlined />}
          title={`No API requests in the last ${range} days`}
          action={
            onTab && (
              <Button onClick={() => onTab("start")}>Get started</Button>
            )
          }
        >
          Nothing has called the API with one of this project&apos;s keys in this period. Once a
          key is used, requests per day, errors and response times appear here.
        </EmptyState>
      </>
    );

  // Trend: the latest half of the range against the half before it.
  const half = Math.floor(range / 2);
  const sum = (list: Day[]) =>
    list.reduce((t, d) => ({ r: t.r + d.requests, e: t.e + d.errors }), { r: 0, e: 0 });
  const latest = sum(days.slice(-half));
  const earlier = sum(days.slice(-half * 2, -half));
  const change = earlier.r === 0 ? null : ((latest.r - earlier.r) / earlier.r) * 100;
  const errorNow = rate(latest.e, latest.r);
  const errorBefore = rate(earlier.e, earlier.r);
  const errorShift = earlier.r === 0 || latest.r === 0 ? null : errorNow - errorBefore;

  const busiest = days.reduce((best, d) => (d.requests > best.requests ? d : best), days[0]!);
  const activeDays = days.filter((d) => d.requests > 0).length;
  const errorRate = rate(report.errors, report.requests);

  const byKey = report.byKey.filter((row) => row.requests > 0).sort((a, b) => b.requests - a.requests);

  return (
    <>
      {header}
      <Strip>
        <div>
          <dt>Requests</dt>
          <dd>
            <strong>{report.requests.toLocaleString()}</strong>
            <small>last {range} days</small>
            <Trend $tone="flat">
              {change === null ? (
                `No requests in the ${half} days before`
              ) : (
                <>
                  {change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {percent(Math.abs(change))} in the last {half} days vs the {half} before
                </>
              )}
            </Trend>
          </dd>
        </div>
        <div>
          <dt>Error rate</dt>
          <dd>
            <strong>{percent(errorRate)}</strong>
            <small>
              {report.errors.toLocaleString()} of {report.requests.toLocaleString()}
            </small>
            <Trend $tone={errorShift === null || Math.abs(errorShift) < 0.5 ? "flat" : errorShift > 0 ? "bad" : "good"}>
              {errorShift === null ? (
                "4xx and 5xx answers"
              ) : Math.abs(errorShift) < 0.5 ? (
                `Steady, was ${percent(errorBefore)}`
              ) : (
                <>
                  {errorShift > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {errorShift > 0 ? "Up" : "Down"} from {percent(errorBefore)}
                </>
              )}
            </Trend>
          </dd>
        </div>
        <div>
          <dt>Busiest day</dt>
          <dd>
            <strong>{busiest.requests.toLocaleString()}</strong>
            <small>{dayLabel(busiest.date)}</small>
            <Trend $tone="flat">
              Active on {activeDays} of {range} days
            </Trend>
          </dd>
        </div>
        <div>
          <dt>Rate limit</dt>
          <dd>
            <strong>{API_RATE_LIMIT_PER_MINUTE}</strong>
            <small>requests / min per key</small>
            <Trend $tone="flat">Per-minute peaks are not recorded</Trend>
          </dd>
        </div>
      </Strip>

      <Box data-tour="api-usage-chart">
        <DayChart days={days} />
      </Box>

      <Tables>
        <Box aria-label="Requests by key">
          <BoxHead>
            <h3>By key</h3>
          </BoxHead>
          {byKey.length === 0 ? (
            <Quiet>No key made requests in this period.</Quiet>
          ) : (
            <Scroll>
              <Ranked>
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col" className="num">
                      Requests
                    </th>
                    <th scope="col" className="num">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byKey.map((row) => (
                    <tr key={row.apiKeyId}>
                      <td
                        className="what"
                        style={{ ["--share" as string]: `${rate(row.requests, report.requests)}%` }}
                      >
                        <span className="name">{row.name}</span>
                        <code className="prefix">{row.prefix}</code>
                      </td>
                      <td className="num strong">{row.requests.toLocaleString()}</td>
                      <td className="num">{percent(rate(row.requests, report.requests))}</td>
                    </tr>
                  ))}
                </tbody>
              </Ranked>
            </Scroll>
          )}
        </Box>

      </Tables>
    </>
  );
}
