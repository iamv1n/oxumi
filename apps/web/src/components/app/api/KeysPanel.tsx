"use client";

import { KeyOutlined, PlusOutlined, StopOutlined, SwapOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Segmented,
  Select,
  Table,
  type TableColumnsType,
  Tooltip,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { LoadError, TableSkeleton } from "@/components/app/agents/states";
import { type } from "@oxumi/ui/design/typography";
import {
  type ApiKey,
  type ApiKeyStatus,
  createApiKey,
  type NewApiKey,
  revokeApiKey,
  rotateApiKey,
  useApiKeys,
} from "@/lib/api";
import { CopyButton } from "./Copy";
import { fullDate, relativeTime } from "./format";
import { SecretModal } from "./SecretModal";
import {
  EmptyState,
  ModalFooter,
  ModalLead,
  Mono,
  RowActions,
  Soft,
  State,
  TableBox,
  type Tone,
  ViewHeader,
} from "./ui";

const STATUS: Record<ApiKeyStatus, { label: string; tone: Tone; hint: string }> = {
  active: { label: "Active", tone: "ok", hint: "Working normally" },
  expiring: {
    label: "Expiring",
    tone: "warn",
    hint: "Replaced by a newer key; still works until its expiry",
  },
  expired: { label: "Expired", tone: "idle", hint: "Past its expiry; requests are refused" },
  revoked: { label: "Revoked", tone: "idle", hint: "Switched off; requests are refused" },
};
const live = (key: ApiKey) => key.status === "active" || key.status === "expiring";

const EXPIRY = [
  { value: 0, label: "Never expires" },
  { value: 30, label: "In 30 days" },
  { value: 90, label: "In 90 days" },
  { value: 365, label: "In 1 year" },
];
const GRACE = [
  { value: 0, label: "Immediately", hint: "The old key stops working right away" },
  { value: 1, label: "1 hour", hint: "Enough for a quick manual swap" },
  { value: 24, label: "24 hours", hint: "Time to deploy the new key everywhere" },
  { value: 168, label: "7 days", hint: "For systems that are slow to update" },
];

const Keys = styled(TableBox)`
  /* Keys that no longer work recede. */
  tr.inactive .name,
  tr.inactive code {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const NameCell = styled.div`
  display: flex;
  flex-direction: column;

  .name {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  small b {
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 500;
  }
`;

const KeyCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};

  code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
  }
  /* The copy button appears with the row, and always for keyboard users. */
  .ant-btn {
    opacity: 0;
  }
  tr:hover & .ant-btn,
  .ant-btn:focus-visible {
    opacity: 1;
  }
  @media (hover: none) {
    .ant-btn {
      opacity: 1;
    }
  }
`;

// How much of a rotated key's grace period is left.
const Countdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  min-width: ${({ theme }) => theme.space(22)};

  span {
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
  }
  i {
    display: block;
    height: 3px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.line};
    overflow: hidden;
  }
  i::after {
    content: "";
    display: block;
    width: var(--left);
    height: 100%;
    background: ${({ theme }) => theme.color.warning};
  }
`;

const GraceChoices = styled(Radio.Group)`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;

  .ant-radio-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0;
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  }
  .ant-radio-wrapper + .ant-radio-wrapper {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  .ant-radio-wrapper-checked {
    background: ${({ theme }) => theme.color.accentSoft};
  }
  .ant-radio-label {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 ${({ theme }) => theme.space(3)};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// Re-renders once a minute so relative times and countdowns stay true.
function useMinuteTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function KeysPanel({
  projectId,
  selectedId,
  onSelect,
}: {
  projectId: string;
  // The key the code panel's sample is written for.
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { message, modal } = App.useApp();
  const keys = useApiKeys(projectId);
  const [form] = Form.useForm<{ name: string; expiresInDays: number }>();
  // Expired and revoked keys are a click away, not in the way.
  const [showInactive, setShowInactive] = useState(false);
  const now = useMinuteTick(Boolean(keys.data?.some((key) => key.status === "expiring")));
  const byId = useMemo(() => new Map((keys.data ?? []).map((key) => [key.id, key])), [keys.data]);
  // The key each replacement took over from.
  const replaced = useMemo(
    () =>
      new Map(
        (keys.data ?? []).flatMap((key) =>
          key.rotatedToId ? [[key.rotatedToId, key] as const] : [],
        ),
      ),
    [keys.data],
  );
  const [creating, setCreating] = useState(false);
  const [rotating, setRotating] = useState<ApiKey | null>(null);
  const [grace, setGrace] = useState(24);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    key: NewApiKey;
    rotated: boolean;
    graceHours?: number;
  } | null>(null);

  const inactiveCount = useMemo(
    () => (keys.data ?? []).filter((key) => !live(key)).length,
    [keys.data],
  );
  const visible = useMemo(
    () => (keys.data ?? []).filter((key) => showInactive || live(key)),
    [keys.data, showInactive],
  );

  const create = async (values: { name: string; expiresInDays: number }) => {
    setBusy(true);
    setFailure(null);
    try {
      const key = await createApiKey(projectId, {
        name: values.name.trim(),
        expiresInDays: values.expiresInDays || undefined,
      });
      setCreating(false);
      setCreated({ key, rotated: false });
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Could not create the key.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    if (!rotating) return;
    setBusy(true);
    setFailure(null);
    try {
      const key = await rotateApiKey(projectId, rotating.id, grace);
      setRotating(null);
      setCreated({ key, rotated: true, graceHours: grace });
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Could not rotate the key.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = (key: ApiKey) => {
    modal.confirm({
      title: `Revoke "${key.name}"?`,
      content: (
        <>
          <Mono>{key.prefix}</Mono> stops working at once: every request made with it will be
          refused with a 401. This cannot be undone. If something still uses this key, rotate it
          instead.
        </>
      ),
      okText: "Revoke key",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await revokeApiKey(projectId, key.id);
          message.success(`Revoked "${key.name}"`);
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not revoke the key.");
        }
      },
    });
  };

  const openCreate = () => {
    setFailure(null);
    setCreating(true);
  };

  const createButton = (
    <Button type="primary" icon={<PlusOutlined />} data-tour="api-create-key" onClick={openCreate}>
      Create key
    </Button>
  );

  const columns: TableColumnsType<ApiKey> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, key) => {
        const successor = key.rotatedToId ? byId.get(key.rotatedToId) : undefined;
        const predecessor = replaced.get(key.id);
        return (
          <NameCell>
            <span className="name">{name}</span>
            {key.rotatedToId && (
              <small>
                Replaced by <b>{successor ? successor.prefix : "a newer key"}</b>
              </small>
            )}
            {!key.rotatedToId && predecessor && live(predecessor) && (
              <small>
                Replaces <b>{predecessor.prefix}</b>
              </small>
            )}
          </NameCell>
        );
      },
    },
    {
      title: "Key",
      dataIndex: "prefix",
      render: (prefix: string) => (
        <KeyCell onClick={(event) => event.stopPropagation()}>
          <code>{prefix}</code>
          <CopyButton
            text={prefix.replace(/…$/, "")}
            what="Key prefix copied"
            tooltip="Copy the prefix (the full key is shown only once)"
          />
        </KeyCell>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: ApiKeyStatus) => (
        <Tooltip title={STATUS[status].hint}>
          <State $tone={STATUS[status].tone} tabIndex={0}>
            {STATUS[status].label}
          </State>
        </Tooltip>
      ),
    },
    {
      title: "Last used",
      dataIndex: "lastUsedAt",
      render: (iso: string | null) =>
        iso ? (
          <Tooltip title={fullDate(iso)}>
            <Soft tabIndex={0}>{relativeTime(iso, now)}</Soft>
          </Tooltip>
        ) : (
          <Soft>Never</Soft>
        ),
    },
    {
      title: "Ends",
      key: "expires",
      render: (_, key) => {
        if (key.status === "revoked" && key.revokedAt)
          return (
            <Tooltip title={`Revoked ${fullDate(key.revokedAt)}`}>
              <Soft tabIndex={0}>{relativeTime(key.revokedAt, now)}</Soft>
            </Tooltip>
          );
        if (!key.expiresAt) return <Soft>Never</Soft>;
        const successor = key.rotatedToId ? byId.get(key.rotatedToId) : undefined;
        if (key.status === "expiring" && successor) {
          // The grace period runs from the rotation to the old key's expiry.
          const start = +new Date(successor.createdAt);
          const end = +new Date(key.expiresAt);
          const left = Math.min(1, Math.max(0, (end - now) / Math.max(1, end - start)));
          return (
            <Tooltip title={`Stops working ${fullDate(key.expiresAt)}`}>
              <Countdown tabIndex={0}>
                <span>Stops {relativeTime(key.expiresAt, now)}</span>
                <i aria-hidden style={{ ["--left" as string]: `${Math.round(left * 100)}%` }} />
              </Countdown>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={fullDate(key.expiresAt)}>
            <Soft tabIndex={0}>
              {key.status === "expired" ? "Expired " : ""}
              {relativeTime(key.expiresAt, now)}
            </Soft>
          </Tooltip>
        );
      },
    },
    {
      key: "actions",
      align: "right",
      width: 88,
      render: (_, key) =>
        live(key) ? (
          <RowActions>
            {key.status === "active" && (
              <Tooltip title="Rotate: replace with a new key">
                <Button
                  size="small"
                  type="text"
                  icon={<SwapOutlined />}
                  aria-label={`Rotate ${key.name} ${key.prefix}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setGrace(24);
                    setFailure(null);
                    setRotating(key);
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title="Revoke: switch off now">
              <Button
                size="small"
                type="text"
                danger
                icon={<StopOutlined />}
                aria-label={`Revoke ${key.name} ${key.prefix}`}
                onClick={(event) => {
                  event.stopPropagation();
                  revoke(key);
                }}
              />
            </Tooltip>
          </RowActions>
        ) : null,
    },
  ];

  let body;
  if (keys.error && !keys.data) {
    body = (
      <LoadError
        title="API keys could not be loaded"
        error={keys.error}
        onRetry={() => keys.mutate()}
      />
    );
  } else if (!keys.data) {
    body = <TableSkeleton rows={3} />;
  } else if (keys.data.length === 0) {
    body = (
      <EmptyState icon={<KeyOutlined />} title="No API keys yet">
        A key lets your own software use this project: list its agents, place calls and read
        results. Create one per system, so you can switch a single integration off without
        touching the others. Each key is shown once, when it is created.
      </EmptyState>
    );
  } else {
    body = (
      <Keys data-tour="api-keys-table">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visible}
          pagination={false}
          scroll={{ x: "max-content" }}
          rowClassName={(key) =>
            `clickable${live(key) ? "" : " inactive"}${key.id === selectedId ? " selected" : ""}`
          }
          onRow={(key) => ({
            tabIndex: 0,
            "aria-selected": key.id === selectedId,
            onClick: () => onSelect(key.id),
            onKeyDown: (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(key.id);
              }
            },
          })}
          locale={{ emptyText: "No working keys. Create one, or show all keys." }}
        />
      </Keys>
    );
  }

  return (
    <>
      <ViewHeader
        title="API keys"
        actions={
          <>
            {inactiveCount > 0 && (
              <Segmented
                size="small"
                aria-label="Which keys to list"
                value={showInactive ? "all" : "working"}
                onChange={(value) => setShowInactive(value === "all")}
                options={[
                  { value: "working", label: "Working" },
                  { value: "all", label: `All (${keys.data?.length ?? 0})` },
                ]}
              />
            )}
            {createButton}
          </>
        }
      >
        One key per system that connects. A key can read this project&apos;s agents and calls and
        place calls; it cannot change agents or reach other projects. Select a key to use it in
        the code panel.
      </ViewHeader>
      {body}

      <Modal
        title="Create API key"
        open={creating}
        onCancel={() => !busy && setCreating(false)}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
          initialValues={{ name: "", expiresInDays: 0 }}
          disabled={busy}
          onFinish={create}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Name"
            extra="Name it after the system that will use it, e.g. “CRM integration”."
            rules={[
              { required: true, whitespace: true, message: "Give the key a name" },
              { max: 60, message: "Keep the name under 60 characters" },
            ]}
          >
            <Input autoFocus autoComplete="off" placeholder="CRM integration" />
          </Form.Item>
          <Form.Item
            name="expiresInDays"
            label="Expiry"
            extra="An expiring key limits the damage if it ever leaks. You can rotate it before it runs out."
          >
            <Select options={EXPIRY} />
          </Form.Item>
          {failure && <Alert type="error" showIcon title={failure} />}
          <ModalFooter>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={busy}>
              Create key
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal
        title={rotating ? `Rotate "${rotating.name}"` : "Rotate key"}
        open={rotating !== null}
        onCancel={() => !busy && setRotating(null)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <ModalLead>
          Rotating issues a <b>new key</b> to replace <Mono>{rotating?.prefix}</Mono>. So nothing
          breaks while you swap it in, the old key can keep working for a grace period.
        </ModalLead>
        <Form layout="vertical" disabled={busy}>
          <Form.Item label="Keep the old key working for" style={{ marginBottom: 0 }}>
            <GraceChoices value={grace} onChange={(e) => setGrace(e.target.value as number)}>
              {GRACE.map((option) => (
                <Radio key={option.value} value={option.value}>
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </Radio>
              ))}
            </GraceChoices>
          </Form.Item>
        </Form>
        {failure && <Alert style={{ marginTop: 16 }} type="error" showIcon title={failure} />}
        <ModalFooter>
          <Button onClick={() => setRotating(null)} disabled={busy}>
            Cancel
          </Button>
          <Button type="primary" loading={busy} onClick={rotate}>
            Rotate key
          </Button>
        </ModalFooter>
      </Modal>

      <SecretModal
        open={created !== null}
        title={created?.rotated ? "Your replacement key" : "Your new API key"}
        label="API key"
        secret={created?.key.secret ?? ""}
        lostAdvice="If you lose it, rotate the key to get a new one."
        lead={
          created && (
            <>
              Copy <b>{created.key.name}</b> now and store it somewhere safe, such as your
              server&apos;s secrets or a password manager.
              {created.rotated &&
                (created.graceHours
                  ? ` The old key keeps working for ${GRACE.find((g) => g.value === created.graceHours)?.label.toLowerCase() ?? `${created.graceHours} hours`}.`
                  : " The old key has stopped working.")}
            </>
          )
        }
        onDone={() => setCreated(null)}
      />
    </>
  );
}
