"use client";

import { ExpandAltOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Table, type TableColumnsType, Tooltip } from "antd";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  retryWebhookDelivery,
  useWebhookDeliveries,
  useWebhooks,
  type WebhookDelivery,
} from "@/lib/api";
import { DELIVERY, DeliveryState, response } from "./delivery";
import { DeliveryDrawer } from "./DeliveryDrawer";
import { fullDate, relativeTime } from "./format";
import { BoxHead, Mono, Quiet, RowActions, Soft, TableBox } from "./ui";

// The log of webhook deliveries. Selecting a row puts that delivery's
// request in the code panel; the expand button opens it in full, with Retry.

export const MAX_ATTEMPTS = 6;

// "example.com/hooks/oxumi" from a full URL.
export function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

export function Deliveries({
  projectId,
  selectedId,
  onSelect,
  limit,
  footer,
}: {
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Show only the newest few (the Webhooks view); otherwise all, in pages.
  limit?: number;
  // Shown under a limited list, e.g. a link to the full log.
  footer?: ReactNode;
}) {
  const { message } = App.useApp();
  const webhooks = useWebhooks(projectId);
  const deliveries = useWebhookDeliveries(projectId);
  const [working, setWorking] = useState<string | null>(null);
  // The delivery open in the side drawer.
  const [openId, setOpenId] = useState<string | null>(null);

  // While something is waiting to be retried, keep the list fresh.
  const refresh = deliveries.mutate;
  const waiting = deliveries.data?.some((d) => d.status === "pending") ?? false;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(timer);
  }, [waiting, refresh]);

  const urlOf = useMemo(
    () => new Map((webhooks.data ?? []).map((w) => [w.id, w.url])),
    [webhooks.data],
  );
  const newestFirst = useMemo(
    () =>
      [...(deliveries.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [deliveries.data],
  );
  const rows = limit ? newestFirst.slice(0, limit) : newestFirst;
  const opened = openId ? (newestFirst.find((d) => d.id === openId) ?? null) : null;
  const failing = newestFirst.filter((d) => d.status !== "delivered").length;

  const retry = async (delivery: WebhookDelivery) => {
    setWorking(delivery.id);
    try {
      const result = await retryWebhookDelivery(projectId, delivery.id);
      if (result.status === "delivered") message.success("Delivered");
      else message.warning(`Still not delivered: ${response(result)}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not retry the delivery.");
    } finally {
      setWorking(null);
    }
  };

  const columns: TableColumnsType<WebhookDelivery> = [
    {
      title: "Status",
      key: "status",
      render: (_, delivery) => <DeliveryState delivery={delivery} />,
    },
    { title: "Event", dataIndex: "event", render: (event: string) => <Mono>{event}</Mono> },
    {
      title: "Endpoint",
      dataIndex: "endpointId",
      responsive: ["xl"],
      render: (id: string) =>
        urlOf.has(id) ? <Mono>{shortUrl(urlOf.get(id)!)}</Mono> : <Soft>Deleted endpoint</Soft>,
    },
    {
      title: "Response",
      key: "response",
      render: (_, delivery) => <Soft>{response(delivery)}</Soft>,
    },
    {
      title: "Attempts",
      dataIndex: "attempts",
      responsive: ["md"],
      render: (count: number, delivery) => (
        <Soft>
          {count} of {MAX_ATTEMPTS}
          {delivery.status === "pending" && delivery.nextAttemptAt && (
            <span title={fullDate(delivery.nextAttemptAt)}>
              {" "}
              · next {relativeTime(delivery.nextAttemptAt)}
            </span>
          )}
        </Soft>
      ),
    },
    {
      title: "Sent",
      dataIndex: "createdAt",
      render: (iso: string) => <Soft title={fullDate(iso)}>{relativeTime(iso)}</Soft>,
    },
    {
      key: "actions",
      align: "right",
      width: 72,
      render: (_, delivery) => (
        <RowActions>
          {delivery.status !== "delivered" && urlOf.has(delivery.endpointId) && (
            <Tooltip title="Send again now">
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                loading={working === delivery.id}
                aria-label={`Retry ${delivery.event} delivery`}
                onClick={(event) => {
                  event.stopPropagation();
                  void retry(delivery);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Open: attempts, headers and payload">
            <Button
              size="small"
              type="text"
              icon={<ExpandAltOutlined />}
              aria-label={`Open ${delivery.event} delivery`}
              onClick={(event) => {
                event.stopPropagation();
                setOpenId(delivery.id);
              }}
            />
          </Tooltip>
        </RowActions>
      ),
    },
  ];

  return (
    <TableBox data-tour="api-deliveries" aria-label="Webhook deliveries">
      <BoxHead>
        <h3>{limit ? "Latest deliveries" : "Webhook deliveries"}</h3>
        <span className="meta">
          {deliveries.data?.length
            ? failing
              ? `${failing} not delivered · select a row to see its request`
              : "Select a row to see its request"
            : ""}
        </span>
        <Tooltip title="Refresh">
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            aria-label="Refresh deliveries"
            loading={deliveries.isValidating}
            onClick={() => deliveries.mutate()}
          />
        </Tooltip>
      </BoxHead>
      {deliveries.error && !deliveries.data ? (
        <Quiet role="alert">Deliveries could not be loaded. {deliveries.error.message}</Quiet>
      ) : !deliveries.data ? (
        <Quiet>Loading…</Quiet>
      ) : deliveries.data.length === 0 ? (
        <Quiet>
          Nothing has been sent yet. Press Test on a webhook endpoint to send a sample event.
        </Quiet>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          scroll={{ x: "max-content" }}
          rowClassName={(delivery) =>
            delivery.id === selectedId ? "clickable selected" : "clickable"
          }
          onRow={(delivery) => ({
            tabIndex: 0,
            "aria-selected": delivery.id === selectedId,
            "aria-label": `${delivery.event}, ${DELIVERY[delivery.status].label}. Show its request`,
            onClick: () => onSelect(delivery.id),
            onKeyDown: (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(delivery.id);
              }
            },
          })}
          pagination={
            !limit && rows.length > 12
              ? { pageSize: 12, showSizeChanger: false, size: "small" }
              : false
          }
        />
      )}
      {footer}
      <DeliveryDrawer
        delivery={opened}
        url={opened ? urlOf.get(opened.endpointId) : undefined}
        maxAttempts={MAX_ATTEMPTS}
        retrying={opened ? working === opened.id : false}
        onRetry={retry}
        onClose={() => setOpenId(null)}
      />
    </TableBox>
  );
}
