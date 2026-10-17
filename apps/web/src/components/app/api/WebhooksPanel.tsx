"use client";

import {
  DeleteOutlined,
  PlusOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Tooltip,
} from "antd";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { LoadError, TableSkeleton } from "@/components/app/agents/states";
import { type } from "@oxumi/ui/design/typography";
import {
  createWebhook,
  deleteWebhook,
  type NewWebhook,
  setWebhookEnabled,
  testWebhook,
  useWebhookDeliveries,
  useWebhooks,
  type Webhook,
  type WebhookDelivery,
} from "@/lib/api";
import { Deliveries } from "./Deliveries";
import { DELIVERY, response } from "./delivery";
import { fullDate, shortDate } from "./format";
import { SecretModal } from "./SecretModal";
import {
  Box,
  BoxBody,
  BoxHead,
  EmptyState,
  ModalFooter,
  Mono,
  State,
  ViewHeader,
} from "./ui";

export const RETRY_SCHEDULE = ["30 seconds", "2 minutes", "10 minutes", "1 hour", "6 hours"];

const SPARK = 12;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
`;

const Endpoints = styled.ul`
  li {
    display: grid;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
    min-height: ${({ theme }) => theme.space(13)};
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2)}
      ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  }
  li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  .where {
    min-width: 0;
  }
  .url {
    ${type("code")}
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fg};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  li[data-enabled="false"] .url {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .sub {
    ${type("caption")}
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .health {
    display: none;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)};
  }
  .controls {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
  }
  .side {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(5)};
  }

  ${({ theme }) => theme.media.sm} {
    li {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .health {
      display: flex;
    }
  }
`;

// The last deliveries to one endpoint, oldest on the left.
const Spark = styled.span`
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: ${({ theme }) => theme.space(4)};

  i {
    width: 4px;
    height: 100%;
    border-radius: 1px;
    background: ${({ theme }) => theme.color.line};
  }
  i[data-status="delivered"] {
    background: ${({ theme }) => theme.color.success};
  }
  i[data-status="pending"] {
    height: 60%;
    background: ${({ theme }) => theme.color.warning};
  }
  i[data-status="failed"] {
    background: ${({ theme }) => theme.color.danger};
  }
`;

const Rate = styled.span`
  ${type("caption")}
  min-width: ${({ theme }) => theme.space(22)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;
`;

const Retries = styled(BoxBody)`
  p {
    ${type("label")}
    max-width: 46rem;
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
  p code {
    ${type("code")}
    font-size: ${({ theme }) => theme.text.caption.size};
    padding: 0 ${({ theme }) => theme.space(1)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

// The waits between attempts, as a timeline.
const Schedule = styled.ol`
  display: flex;
  flex-wrap: wrap;
  margin: ${({ theme }) => theme.space(3)} 0;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;

  li {
    display: flex;
    flex: 1 1 ${({ theme }) => theme.space(22)};
    flex-direction: column;
    margin: -1px 0 0 -1px;
    padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
  li span:first-child {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  li span:last-child {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`;

const More = styled.button`
  ${type("caption")}
  display: block;
  width: 100%;
  height: ${({ theme }) => theme.space(8)};
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: none;
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }
`;

export function WebhooksPanel({
  projectId,
  deliveryId,
  onDelivery,
  onLogs,
}: {
  projectId: string;
  // The delivery whose request is in the code panel.
  deliveryId: string | null;
  onDelivery: (id: string) => void;
  // Opens the full log.
  onLogs: () => void;
}) {
  const { message, modal } = App.useApp();
  const webhooks = useWebhooks(projectId);
  const deliveries = useWebhookDeliveries(projectId);
  const [form] = Form.useForm<{ url: string }>();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<NewWebhook | null>(null);
  // The latest Test result per endpoint, shown in its row straight away.
  const [tested, setTested] = useState<Record<string, WebhookDelivery>>({});
  const [working, setWorking] = useState<string | null>(null);

  const add = async (values: { url: string }) => {
    setBusy(true);
    setFailure(null);
    try {
      const webhook = await createWebhook(projectId, { url: values.url.trim() });
      setAdding(false);
      setCreated(webhook);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Could not add the webhook.");
    } finally {
      setBusy(false);
    }
  };

  const run = async <T,>(id: string, action: () => Promise<T>, fallback: string) => {
    setWorking(id);
    try {
      return await action();
    } catch (err) {
      message.error(err instanceof Error ? err.message : fallback);
      return undefined;
    } finally {
      setWorking(null);
    }
  };

  const test = async (webhook: Webhook) => {
    const delivery = await run(
      `test:${webhook.id}`,
      () => testWebhook(projectId, webhook.id),
      "Could not send the test.",
    );
    if (!delivery) return;
    setTested((current) => ({ ...current, [webhook.id]: delivery }));
    if (delivery.status === "delivered") message.success("Test delivered");
    else message.warning(`Test not delivered: ${response(delivery)}`);
  };

  const remove = (webhook: Webhook) => {
    modal.confirm({
      title: "Delete this webhook?",
      content: (
        <>
          <Mono>{webhook.url}</Mono> will no longer be told when calls end, and anything still
          waiting to be retried for it is dropped. To pause it instead, switch it off.
        </>
      ),
      okText: "Delete webhook",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await deleteWebhook(projectId, webhook.id);
          message.success("Webhook deleted");
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not delete the webhook.");
        }
      },
    });
  };

  const addButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      data-tour="api-add-webhook"
      onClick={() => {
        setFailure(null);
        setAdding(true);
      }}
    >
      Add webhook
    </Button>
  );

  const newestFirst = useMemo(
    () =>
      [...(deliveries.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [deliveries.data],
  );
  // Per endpoint: its latest deliveries, oldest first, for the spark bar.
  const recentOf = (endpointId: string) =>
    newestFirst.filter((d) => d.endpointId === endpointId).slice(0, SPARK).reverse();
  let endpoints;
  if (webhooks.error && !webhooks.data) {
    endpoints = (
      <LoadError
        title="Webhooks could not be loaded"
        error={webhooks.error}
        onRetry={() => webhooks.mutate()}
      />
    );
  } else if (!webhooks.data) {
    endpoints = <TableSkeleton rows={2} />;
  } else if (webhooks.data.length === 0) {
    endpoints = (
      <EmptyState icon={<ThunderboltOutlined />} title="No webhooks yet">
        A webhook is a URL in your system that we call the moment a call placed through the API
        ends, with the outcome, the answers collected and the transcript. Without one you would
        have to keep asking for the result.
      </EmptyState>
    );
  } else {
    endpoints = (
      <Box data-tour="api-webhooks-table" aria-label="Endpoints">
        <BoxHead>
          <h3>Endpoints</h3>
          <span className="meta">
            {webhooks.data.filter((w) => w.enabled).length} of {webhooks.data.length} enabled
          </span>
        </BoxHead>
        <Endpoints>
          {webhooks.data.map((webhook) => {
            const recent = recentOf(webhook.id);
            const delivered = recent.filter((d) => d.status === "delivered").length;
            const last = tested[webhook.id];
            return (
              <li key={webhook.id} data-enabled={webhook.enabled}>
                <div className="where">
                  <code className="url" title={webhook.url}>
                    {webhook.url}
                  </code>
                  <div className="sub">
                    <State $tone={webhook.enabled ? "ok" : "idle"}>
                      {webhook.enabled ? "Enabled" : "Paused"}
                    </State>
                    <span>{webhook.events.join(", ")}</span>
                    <span title={fullDate(webhook.createdAt)}>
                      added {shortDate(webhook.createdAt)}
                    </span>
                    {last && (
                      <span role="status">
                        · test {DELIVERY[last.status].label.toLowerCase()}: {response(last)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="side">
                  <div className="health">
                    <Spark
                      role="img"
                      aria-label={
                        recent.length
                          ? `Last ${recent.length} deliveries: ${delivered} delivered, ${recent.length - delivered} not`
                          : "No deliveries yet"
                      }
                    >
                      {Array.from({ length: SPARK }, (_, i) => {
                        const delivery = recent[i - (SPARK - recent.length)];
                        return <i key={i} data-status={delivery?.status} />;
                      })}
                    </Spark>
                    <Rate>
                      {recent.length ? `${delivered}/${recent.length} delivered` : "No deliveries"}
                    </Rate>
                  </div>
                  <div className="controls">
                    <Button
                      size="small"
                      icon={<SendOutlined />}
                      loading={working === `test:${webhook.id}`}
                      aria-label={`Send a test to ${webhook.url}`}
                      onClick={() => test(webhook)}
                    >
                      Test
                    </Button>
                    <Tooltip title={webhook.enabled ? "Pause deliveries" : "Resume deliveries"}>
                      <Switch
                        size="small"
                        checked={webhook.enabled}
                        loading={working === `toggle:${webhook.id}`}
                        aria-label={`${webhook.enabled ? "Disable" : "Enable"} ${webhook.url}`}
                        onChange={(next) =>
                          run(
                            `toggle:${webhook.id}`,
                            () => setWebhookEnabled(projectId, webhook.id, next),
                            "Could not change the webhook.",
                          )
                        }
                      />
                    </Tooltip>
                    <Tooltip title="Delete webhook">
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Delete ${webhook.url}`}
                        onClick={() => remove(webhook)}
                      />
                    </Tooltip>
                  </div>
                </div>
              </li>
            );
          })}
        </Endpoints>
      </Box>
    );
  }

  return (
    <Stack>
      <div>
        <ViewHeader title="Webhooks" actions={addButton}>
          Where results are sent. When a call placed through the API ends, each enabled endpoint
          is posted the outcome, answers and transcript.
        </ViewHeader>
        {endpoints}
      </div>

      {webhooks.data && webhooks.data.length > 0 && (
        <Deliveries
          projectId={projectId}
          selectedId={deliveryId}
          onSelect={onDelivery}
          limit={5}
          footer={
            (deliveries.data?.length ?? 0) > 5 && (
              <More type="button" onClick={onLogs}>
                All {deliveries.data?.length} deliveries in Logs
              </More>
            )
          }
        />
      )}

      <Box aria-labelledby="webhook-retries-title">
        <BoxHead>
          <h3 id="webhook-retries-title">If your endpoint is down</h3>
          <span className="meta">
            Retried {RETRY_SCHEDULE.length} times over about 7 hours
          </span>
        </BoxHead>
        <Retries>
          <p>
            A delivery is done when your endpoint answers with any 2xx status within 10 seconds.
            Anything else is sent again after:
          </p>
          <Schedule>
            {RETRY_SCHEDULE.map((wait, i) => (
              <li key={wait}>
                <span>Retry {i + 1}</span>
                <span>{wait}</span>
              </li>
            ))}
          </Schedule>
          <p>
            After the last retry the delivery is marked failed; you can still send it again from
            the log. Answer quickly, do slow work afterwards, and use the{" "}
            <code>Oxumi-Delivery</code> header to ignore one you have already handled.
          </p>
        </Retries>
      </Box>

      <Modal
        title="Add webhook"
        open={adding}
        onCancel={() => !busy && setAdding(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
          initialValues={{ url: "" }}
          disabled={busy}
          onFinish={add}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="url"
            label="Endpoint URL"
            extra="Where we send a POST request when a call ends. It must use https in production; plain http is accepted only on a development server."
            rules={[
              { required: true, whitespace: true, message: "Enter the URL to send events to" },
              {
                validator: (_, value: string) =>
                  !value?.trim() || /^https?:\/\/\S+$/i.test(value.trim())
                    ? Promise.resolve()
                    : Promise.reject(new Error("Start the URL with https://")),
              },
            ]}
          >
            <Input
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com/hooks/oxumi"
            />
          </Form.Item>
          {failure && <Alert type="error" showIcon title={failure} />}
          <ModalFooter>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={busy}>
              Add webhook
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <SecretModal
        open={created !== null}
        title="Your signing secret"
        label="Signing secret"
        secret={created?.secret ?? ""}
        lostAdvice="If you lose it, delete this webhook and add it again."
        lead={
          <>
            Your endpoint uses this secret to check that a request really came from Oxumi.
            Copy it now and keep it with your server&apos;s other secrets.
          </>
        }
        onDone={() => setCreated(null)}
      />
    </Stack>
  );
}
