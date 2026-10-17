"use client";

import { Skeleton } from "antd";
import styled from "styled-components";
import { formatMs } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { useApiUsage } from "@/lib/api";
import { Deliveries } from "./Deliveries";
import { Box, BoxBody, BoxHead, Method, Quiet, ViewHeader } from "./ui";

// What went out and what came in: every webhook delivery, and the API
// requests of the last 30 days grouped by endpoint. Selecting a row shows
// its request in the code panel.

export interface RouteSelection {
  method: string;
  route: string;
  requests: number;
  errors: number;
}

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

const Routes = styled.table`
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
    height: ${({ theme }) => theme.space(9)};
    padding: 0 ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
    white-space: nowrap;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover td {
    background: ${({ theme }) => theme.color.hover};
  }
  tbody tr:focus-visible td {
    background: ${({ theme }) => theme.color.hover};
  }
  tbody tr[aria-selected="true"] td {
    background: ${({ theme }) => theme.color.accentSoft};
  }
  tbody tr[aria-selected="true"] td:first-child {
    box-shadow: inset 2px 0 0 ${({ theme }) => theme.color.accentLine};
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
  .bar {
    width: 28%;
    min-width: ${({ theme }) => theme.space(16)};
  }
  .bar i {
    display: block;
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: 1px;
    background: ${({ theme }) => theme.color.line};
    overflow: hidden;
  }
  .bar i::after {
    content: "";
    display: block;
    width: var(--share);
    height: 100%;
    background: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Scroll = styled.div`
  overflow-x: auto;
`;

const percent = (part: number, whole: number) =>
  whole === 0 ? "0%" : `${((part / whole) * 100).toFixed(part / whole < 0.1 && part > 0 ? 1 : 0)}%`;

export function LogsPanel({
  projectId,
  deliveryId,
  onDelivery,
  route,
  onRoute,
}: {
  projectId: string;
  // The selected delivery, if a delivery is what is selected.
  deliveryId: string | null;
  onDelivery: (id: string) => void;
  // The selected endpoint row, if that is what is selected.
  route: RouteSelection | null;
  onRoute: (route: RouteSelection) => void;
}) {
  const usage = useApiUsage(projectId, 30);
  const rows = [...(usage.data?.byRoute ?? [])].sort((a, b) => b.requests - a.requests);
  const top = rows[0]?.requests ?? 0;

  return (
    <div>
      <ViewHeader title="Logs">
        What we sent to your webhooks and what your software asked of the API. Select a row to
        see its request in the code panel.
      </ViewHeader>
      <Stack>
        <Deliveries projectId={projectId} selectedId={deliveryId} onSelect={onDelivery} />

        <Box data-tour="api-requests" aria-label="API requests by endpoint">
          <BoxHead>
            <h3>API requests by endpoint</h3>
            <span className="meta">
              Last 30 days · totals per endpoint; single requests are not recorded
            </span>
          </BoxHead>
          {usage.error && !usage.data ? (
            <Quiet role="alert">Requests could not be loaded. {usage.error.message}</Quiet>
          ) : !usage.data ? (
            <BoxBody aria-busy="true">
              <Skeleton active title={false} paragraph={{ rows: 4 }} />
            </BoxBody>
          ) : rows.length === 0 ? (
            <Quiet>No API requests in the last 30 days.</Quiet>
          ) : (
            <Scroll>
              <Routes>
                <thead>
                  <tr>
                    <th scope="col">Endpoint</th>
                    <th scope="col" aria-label="Share of the busiest endpoint" />
                    <th scope="col" className="num">
                      Requests
                    </th>
                    <th scope="col" className="num">
                      Errors
                    </th>
                    <th scope="col" className="num">
                      Median
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const selected = route?.method === row.method && route.route === row.route;
                    const pick = () =>
                      onRoute({
                        method: row.method,
                        route: row.route,
                        requests: row.requests,
                        errors: row.errors,
                      });
                    return (
                      <tr
                        key={`${row.method} ${row.route}`}
                        tabIndex={0}
                        aria-selected={selected}
                        onClick={pick}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            pick();
                          }
                        }}
                      >
                        <td>
                          <Method $method={row.method}>{row.method}</Method>
                          <code>{row.route}</code>
                        </td>
                        <td className="bar">
                          <i
                            aria-hidden
                            style={{ ["--share" as string]: `${(row.requests / top) * 100}%` }}
                          />
                        </td>
                        <td className="num strong">{row.requests.toLocaleString()}</td>
                        <td className={row.errors ? "num bad" : "num"}>
                          {percent(row.errors, row.requests)}
                        </td>
                        <td className="num">{formatMs(Math.round(row.medianMs))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Routes>
            </Scroll>
          )}
        </Box>
      </Stack>
    </div>
  );
}
