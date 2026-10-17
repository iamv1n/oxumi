"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import styled from "styled-components";
import { CodeBlock, JsonBlock } from "@oxumi/ui/docs/CodeBlock";
import { type } from "@oxumi/ui/design/typography";
import type { WebhookDelivery } from "@/lib/api";
import { CopyButton } from "./Copy";
import { fullDate, relativeTime } from "./format";
import { DeliveryState, response } from "./delivery";
import { Mono } from "./ui";

// One delivery in full: what was sent, where, what came back and what
// happens next.

const Section = styled.section`
  & + & {
    margin-top: ${({ theme }) => theme.space(5)};
  }
  > h3 {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  > p {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space(28)} minmax(0, 1fr);
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};

  dt,
  dd {
    ${type("label")}
    display: flex;
    align-items: center;
    min-height: ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    font-weight: 400;
  }
  dt:first-of-type,
  dt:first-of-type + dd {
    border-top: 0;
  }
  dt {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  dd {
    gap: ${({ theme }) => theme.space(1)};
    min-width: 0;
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};

  code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
    font-size: ${({ theme }) => theme.text.body.size};
  }
`;

export function DeliveryDrawer({
  delivery,
  url,
  maxAttempts,
  retrying,
  onRetry,
  onClose,
}: {
  // Null closes the drawer.
  delivery: WebhookDelivery | null;
  // The endpoint's URL; undefined when the endpoint has been deleted.
  url?: string;
  maxAttempts: number;
  retrying: boolean;
  onRetry: (delivery: WebhookDelivery) => void;
  onClose: () => void;
}) {
  const canRetry = Boolean(delivery && delivery.status !== "delivered" && url);
  const headers = delivery
    ? [
        "POST " + (url ?? "(deleted endpoint)"),
        "Content-Type: application/json",
        "User-Agent: Oxumi-Webhooks/1",
        `Oxumi-Event: ${delivery.event}`,
        `Oxumi-Delivery: ${delivery.id}`,
        "Oxumi-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>",
      ].join("\n")
    : "";

  return (
    <Drawer
      open={delivery !== null}
      onClose={onClose}
      size={560}
      destroyOnHidden
      title={
        delivery && (
          <Title>
            <code>{delivery.event}</code>
            <DeliveryState delivery={delivery} />
          </Title>
        )
      }
      extra={
        canRetry &&
        delivery && (
          <Button
            icon={<ReloadOutlined />}
            loading={retrying}
            onClick={() => onRetry(delivery)}
          >
            Retry now
          </Button>
        )
      }
    >
      {delivery && (
        <>
          <Section>
            <h3>Delivery</h3>
            <Facts>
              <dt>ID</dt>
              <dd>
                <Mono>{delivery.id}</Mono>
                <CopyButton text={delivery.id} what="Delivery ID copied" tooltip="Copy the ID" />
              </dd>
              <dt>Endpoint</dt>
              <dd>{url ? <Mono>{url}</Mono> : "Deleted endpoint"}</dd>
              <dt>Created</dt>
              <dd>
                {fullDate(delivery.createdAt)} ({relativeTime(delivery.createdAt)})
              </dd>
              <dt>Delivered</dt>
              <dd>{delivery.deliveredAt ? fullDate(delivery.deliveredAt) : "Not yet"}</dd>
            </Facts>
          </Section>

          <Section>
            <h3>Attempts</h3>
            <Facts>
              <dt>Made</dt>
              <dd>
                {delivery.attempts} of {maxAttempts}
              </dd>
              <dt>Last response</dt>
              <dd>{response(delivery)}</dd>
              <dt>Next</dt>
              <dd>
                {delivery.status === "pending" && delivery.nextAttemptAt
                  ? `Retry ${relativeTime(delivery.nextAttemptAt)} (${fullDate(delivery.nextAttemptAt)})`
                  : delivery.status === "failed"
                    ? "None. Gave up after the last retry; send it again with Retry now."
                    : "Nothing more to do"}
              </dd>
            </Facts>
            <p>Only the latest attempt&apos;s result is kept, not each attempt separately.</p>
          </Section>

          <Section>
            <h3>Request</h3>
            <CodeBlock code={headers} language="http" title="Headers" />
            <p>
              The signature is computed for each attempt from its timestamp and the body, so it
              is shown here as its format rather than a value.
            </p>
          </Section>

          <Section>
            <h3>Body</h3>
            <JsonBlock value={delivery.payload} title="Payload" />
          </Section>
        </>
      )}
    </Drawer>
  );
}
