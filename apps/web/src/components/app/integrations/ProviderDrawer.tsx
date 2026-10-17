"use client";

import {
  CheckCircleFilled,
  CloseCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  InfoCircleFilled,
  KeyOutlined,
  LoadingOutlined,
  LockOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Alert, App, Button, Drawer, Input, Popconfirm, Select, Tooltip } from "antd";
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from "react";
import styled from "styled-components";
import { API_URL, ApiError, type Credential, type Health } from "@/lib/api";
import { type } from "@oxumi/ui/design/typography";
import { ProviderTile } from "./logos/ProviderLogo";
import {
  type Actions,
  ago,
  cleanOption,
  inSentence,
  KIND_LABEL,
  listed,
  missingLabels,
  optionProblem,
  SECRET,
  secretProblem,
  sectionsOf,
  statusOf,
  testNote,
  type Tone,
  type Usage,
} from "./model";
import { StatusMark } from "./StatusMark";

// The panel a provider opens into: its fields in numbered steps, the test
// and its result, who uses it, and disconnecting it.

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  min-width: 0;

  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    display: block;
    ${type("caption")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .state {
    margin-left: auto;
  }
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
`;

const Step = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space(2.5)};

  > header {
    display: flex;
    align-items: baseline;
    gap: ${({ theme }) => theme.space(2)};
    padding-bottom: ${({ theme }) => theme.space(1.5)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  > header .number {
    display: grid;
    place-items: center;
    align-self: center;
    width: 18px;
    height: 18px;
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.hover};
    ${type("caption")}
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.fg};
  }
  > header h3 {
    flex: 1;
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    ${type("caption")}
    font-weight: 500;
    border-radius: ${({ theme }) => theme.radius.small};
    color: ${({ theme }) => theme.color.accentText};
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
  .hint {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .error {
    ${type("caption")}
    color: ${({ theme }) => theme.color.danger};
  }
`;

const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(1)};
  min-width: 0;

  label {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  label abbr {
    margin-left: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.danger};
    text-decoration: none;
  }
  label i {
    margin-left: ${({ theme }) => theme.space(1.5)};
    ${type("caption")}
    font-style: normal;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Saved = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.space(1)} 0 ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};

  .anticon {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  code {
    flex: 1;
    min-width: 0;
    ${type("code")}
    color: ${({ theme }) => theme.color.fgMuted};
    letter-spacing: 0.04em;
  }
`;

const Result = styled.div<{ $tone: Tone }>`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  align-items: center;
  min-height: 44px;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};

  > .anticon {
    font-size: 14px;
    color: ${({ theme, $tone }) => ($tone === "muted" ? theme.color.fgSubtle : theme.color[$tone])};
  }
  strong {
    display: block;
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    display: block;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
    overflow-wrap: anywhere;
  }
`;

const Setup = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  counter-reset: item;

  li {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(2)};
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
    counter-increment: item;
  }
  li::before {
    content: counter(item, lower-alpha) ".";
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
  .address {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    margin-top: ${({ theme }) => theme.space(1.5)};
    padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(0.5)}
      ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
  }
  .address code {
    flex: 1;
    min-width: 0;
    ${type("code")}
    font-size: 0.75rem;
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
    user-select: all;
  }
`;

const Agents = styled.p`
  ${type("label")}
  font-weight: 400;
  color: ${({ theme }) => theme.color.fgMuted};

  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  .grow {
    flex: 1;
  }
`;

type Outcome =
  | { kind: "verified" }
  | { kind: "rejected"; reason: string }
  // The test itself could not run: the server or network failed.
  | { kind: "error"; reason: string }
  | { kind: "saved" };

const reasonOf = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status === 0
    ? "The server could not be reached. Check your connection and try again."
    : error instanceof ApiError && error.status === 403
      ? "You do not have permission to change this project's integrations."
      : error instanceof Error
        ? error.message
        : fallback;

// The one-time setup on Exotel's side, which only the account owner can do.
function ExotelSetup({ health }: { health?: Health }) {
  const { message } = App.useApp();
  // The address the server itself will use, when it has one.
  const base = (health?.phone.publicUrl || API_URL).replace(/\/+$/, "");
  const address = `${base}/telephony/exotel/stream`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      void message.success("Address copied");
    } catch {
      void message.error("Could not copy. Select the address and copy it by hand.");
    }
  };
  return (
    <Setup data-setup="exotel">
      <li>
        <span>
          In the Exotel dashboard, <b>create an App</b> (a call flow) and add a <b>Voicebot</b>{" "}
          step to it.
        </span>
      </li>
      <li>
        <span>
          Set that step&apos;s URL to this address, in <b>dynamic</b> mode:
          <span className="address">
            <code>{address}</code>
            <Tooltip title="Copy the address">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                aria-label="Copy the stream address"
                onClick={copy}
              />
            </Tooltip>
          </span>
        </span>
      </li>
      <li>
        <span>
          Save the app, then enter its <b>App ID</b> and your <b>ExoPhone</b> in the next step.
        </span>
      </li>
    </Setup>
  );
}

function Editor({
  credential,
  usage,
  health,
  actions,
  formId,
  onBusy,
  onDirty,
  onReplacing,
  onRemoved,
}: {
  credential: Credential;
  usage: Usage;
  health?: Health;
  actions: Actions;
  formId: string;
  onBusy: (busy: Busy) => void;
  onDirty: (dirty: boolean) => void;
  // Whether saving now would store a new key, and so test it.
  onReplacing: (replacing: boolean) => void;
  onRemoved: () => void;
}) {
  const id = useId();
  const { provider, label } = credential;
  const own = credential.source === "project";
  const status = statusOf(credential);
  const telephony = credential.kind === "telephony";
  const secretName = credential.secretLabel;
  const required = (name: string) =>
    credential.optionFields.find((field) => field.name === name)?.required ?? false;

  const [secret, setSecret] = useState("");
  const [replacing, setReplacingState] = useState(!own);
  const setReplacing = (next: boolean) => {
    setReplacingState(next);
    onReplacing(next);
  };
  const [options, setOptions] = useState<Record<string, string>>(credential.options);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [busy, setBusyState] = useState<Busy>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const setBusy = (next: Busy) => {
    setBusyState(next);
    onBusy(next);
  };
  const dirtyWith = (nextSecret: string, nextOptions: Record<string, string>) =>
    nextSecret.trim() !== "" ||
    credential.optionFields.some(
      (field) => (nextOptions[field.name] ?? "").trim() !== (credential.options[field.name] ?? ""),
    );
  const dirty = dirtyWith(secret, options);

  const clearProblem = (name: string) =>
    setProblems((current) => {
      if (!current[name]) return current;
      const rest = { ...current };
      delete rest[name];
      return rest;
    });
  const changeSecret = (value: string) => {
    setSecret(value);
    clearProblem(SECRET);
    onDirty(dirtyWith(value, options));
  };
  const changeOption = (name: string, value: string) => {
    const next = { ...options, [name]: value };
    setOptions(next);
    clearProblem(name);
    onDirty(dirtyWith(secret, next));
  };

  const test = async () => {
    setBusy("test");
    setFailure(null);
    try {
      const result = await actions.verify(provider);
      setOutcome(
        result.ok
          ? { kind: "verified" }
          : { kind: "rejected", reason: result.error ?? `${label} did not accept it.` },
      );
    } catch (error) {
      setOutcome({ kind: "error", reason: reasonOf(error, "The test could not be run.") });
    } finally {
      setBusy(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = secret.trim();
    const found: Record<string, string> = {};
    const clean: Record<string, string> = {};
    if (replacing) {
      const issue = secretProblem(trimmed, secretName);
      if (issue) found[SECRET] = issue;
    }
    for (const field of credential.optionFields) {
      const value = cleanOption(provider, field.name, options[field.name] ?? "");
      if (value) clean[field.name] = value;
      const issue = value
        ? optionProblem(provider, field.name, value)
        : field.required
          ? `${field.label} is required.`
          : null;
      if (issue) found[field.name] = issue;
    }
    setProblems(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    setBusy("save");
    setFailure(null);
    setOutcome(null);
    try {
      await actions.save(provider, { ...(replacing ? { secret: trimmed } : {}), options: clean });
    } catch (error) {
      setFailure(reasonOf(error, `Could not save the ${label} details.`));
      setBusy(null);
      return;
    }
    setSecret("");
    setReplacing(false);
    setOptions(clean);
    onDirty(false);
    // Test whenever what was saved is complete and the test is free, or a
    // new key has just been saved.
    if (replacing || telephony) await test();
    else {
      setOutcome({ kind: "saved" });
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    setFailure(null);
    try {
      await actions.remove(provider);
      onRemoved();
    } catch (error) {
      setFailure(reasonOf(error, `Could not disconnect ${label}.`));
      setBusy(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
      event.currentTarget.requestSubmit();
  };

  // ---- The result line: what just happened, else what the server recorded.
  const hint = credential.hint?.replace(/^…+/, "") ?? "";
  const missing = missingLabels(credential);
  let result: { tone: Tone; icon: ReactNode; title: string; detail?: string };
  if (busy === "test") {
    result = { tone: "muted", icon: <LoadingOutlined />, title: `Testing with ${label}…` };
  } else if (busy === "save") {
    result = { tone: "muted", icon: <LoadingOutlined />, title: "Saving…" };
  } else if (outcome?.kind === "verified") {
    result = {
      tone: "success",
      icon: <CheckCircleFilled />,
      title: `Verified: ${label} accepted the ${inSentence(secretName)}`,
      detail: "Just now",
    };
  } else if (outcome?.kind === "rejected") {
    result = {
      tone: "danger",
      icon: <CloseCircleFilled />,
      title: `Rejected by ${label}`,
      detail: outcome.reason,
    };
  } else if (outcome?.kind === "error") {
    result = {
      tone: "warning",
      icon: <WarningFilled />,
      title: "The test could not be run",
      detail: `${outcome.reason} What you saved is unchanged.`,
    };
  } else if (outcome?.kind === "saved") {
    result = {
      tone: "success",
      icon: <CheckCircleFilled />,
      title: "Saved",
      detail: "The key was not changed, so it was not tested again.",
    };
  } else if (status === "ok") {
    result = {
      tone: "success",
      icon: <CheckCircleFilled />,
      title: `Verified: ${label} accepted the ${inSentence(secretName)}`,
      detail: credential.verifiedAt ? `Last tested ${ago(credential.verifiedAt)}` : undefined,
    };
  } else if (status === "rejected") {
    result = {
      tone: "danger",
      icon: <CloseCircleFilled />,
      title: `Rejected by ${label}`,
      detail: credential.verifyError ?? undefined,
    };
  } else if (status === "incomplete") {
    result = {
      tone: "warning",
      icon: <WarningFilled />,
      title: "Not ready to test",
      detail: `Add the ${listed(missing.map(inSentence))} first.`,
    };
  } else if (status === "untested") {
    result = { tone: "warning", icon: <WarningFilled />, title: "Saved but not tested yet" };
  } else if (status === "platform") {
    result = {
      tone: "info",
      icon: <InfoCircleFilled />,
      title: "Using the platform's key",
      detail: "It is shared and may be limited. Add your own to be billed directly.",
    };
  } else {
    result = {
      tone: "muted",
      icon: <KeyOutlined />,
      title: "Nothing saved yet",
      detail: "Fill in the fields above, then save. It is tested straight away.",
    };
  }
  const canTest = own && status !== "incomplete" && !dirty && !replacing;
  const sections = sectionsOf(credential);
  const firstField = sections[0]?.fields[0];
  const users = [...usage.named, ...usage.byDefault];

  const field = (name: string) => {
    const issue = problems[name];
    const describedBy = `${id}-${name}-note`;
    if (name === SECRET) {
      return (
        <Field key={name}>
          <label htmlFor={`${id}-${name}`}>
            {own && replacing ? `New ${inSentence(secretName)}` : secretName}
            <abbr title="Required" aria-hidden>
              *
            </abbr>
          </label>
          {replacing ? (
            <Input.Password
              id={`${id}-${name}`}
              autoFocus={!own && firstField === SECRET}
              value={secret}
              status={issue ? "error" : undefined}
              placeholder={`Paste your ${label} ${inSentence(secretName)}`}
              autoComplete="new-password"
              spellCheck={false}
              prefix={<KeyOutlined />}
              aria-required
              aria-invalid={!!issue}
              aria-describedby={describedBy}
              onChange={(event) => changeSecret(event.target.value)}
            />
          ) : (
            <Saved>
              <LockOutlined aria-hidden />
              <code id={`${id}-${name}`} aria-label={`Saved ${inSentence(secretName)} ending ${hint}`}>
                ••••••••{hint}
              </code>
              <Button size="small" disabled={!!busy} onClick={() => setReplacing(true)}>
                Replace
              </Button>
            </Saved>
          )}
          {issue ? (
            <span className="error" role="alert" id={describedBy}>
              {issue}
            </span>
          ) : (
            <span className="hint" id={describedBy}>
              {!replacing
                ? "Stored encrypted. It is never shown again, only its last four characters."
                : own
                  ? `Replaces the saved ${inSentence(secretName)} ending ${hint} as soon as you save. `
                  : "Stored encrypted. After saving, only its last four characters are shown. "}
              {own && replacing && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: "auto", fontSize: "inherit" }}
                  onClick={() => {
                    setReplacing(false);
                    changeSecret("");
                  }}
                >
                  Keep the saved one
                </Button>
              )}
            </span>
          )}
        </Field>
      );
    }
    const spec = credential.optionFields.find((option) => option.name === name);
    if (!spec) return null;
    return (
      <Field key={name}>
        <label htmlFor={`${id}-${name}`}>
          {spec.label}
          {spec.required ? (
            <abbr title="Required" aria-hidden>
              *
            </abbr>
          ) : (
            <i>optional</i>
          )}
        </label>
        {spec.choices ? (
          <Select
            id={`${id}-${name}`}
            value={options[name] || spec.choices[0]?.value}
            options={spec.choices}
            aria-describedby={describedBy}
            onChange={(value) => changeOption(name, value)}
          />
        ) : (
          <Input
            id={`${id}-${name}`}
            value={options[name] ?? ""}
            // Opening a half-finished provider lands on what is missing.
            autoFocus={own ? credential.missing[0] === name : firstField === name}
            status={issue ? "error" : undefined}
            aria-required={required(name)}
            aria-invalid={!!issue}
            aria-describedby={describedBy}
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            onChange={(event) => changeOption(name, event.target.value)}
          />
        )}
        {issue ? (
          <span className="error" role="alert" id={describedBy}>
            {issue}
          </span>
        ) : (
          <span className="hint" id={describedBy}>
            {spec.hint}
          </span>
        )}
      </Field>
    );
  };

  // Exotel's own setup sits between its account and its number.
  const steps: { title: string; link?: boolean; note?: string; body: ReactNode }[] = [];
  sections.forEach((section, index) => {
    steps.push({
      title: section.title,
      link: index === 0,
      note: section.note,
      body: section.fields.map(field),
    });
    if (provider === "exotel" && index === 0)
      steps.push({ title: "Set up in Exotel, once", body: <ExotelSetup health={health} /> });
  });

  return (
    <Form
      id={formId}
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      aria-label={`${label} connection`}
    >
      {failure && <Alert type="error" showIcon title={failure} role="alert" />}
      {telephony && health && !health.phone.serverReachable && (
        <Result $tone="warning" role="note" data-note="public-url">
          <WarningFilled />
          <span>
            <strong>The server has no public address</strong>
            <small>
              {label} has to reach this server over the internet to carry a call. You can save and
              test these details, but phone calls will not connect until PUBLIC_URL is set on the
              server.
            </small>
          </span>
        </Result>
      )}
      {steps.map((step, index) => (
        <Step key={step.title} aria-labelledby={`${id}-step-${index}`}>
          <header>
            <span className="number" aria-hidden>
              {index + 1}
            </span>
            <h3 id={`${id}-step-${index}`}>{step.title}</h3>
            {step.link && (
              <a
                href={credential.keysUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${telephony ? `Open ${label}` : "Get a key"} (opens in a new tab)`}
              >
                {telephony ? `Open ${label}` : "Get a key"}
                <ExportOutlined aria-hidden />
              </a>
            )}
          </header>
          {step.body}
          {step.note && <p className="hint">{step.note}</p>}
        </Step>
      ))}
      <Step aria-labelledby={`${id}-check`}>
        <header>
          <span className="number" aria-hidden>
            {steps.length + 1}
          </span>
          <h3 id={`${id}-check`}>Test</h3>
        </header>
        <Result $tone={result.tone} role="status" aria-live="polite" data-result={outcome?.kind ?? status}>
          {result.icon}
          <span>
            <strong>{result.title}</strong>
            {result.detail && <small>{result.detail}</small>}
          </span>
          {own && (
            <Tooltip
              title={
                canTest
                  ? undefined
                  : status === "incomplete"
                    ? "Add the missing details first"
                    : "Save your changes first"
              }
            >
              <Button size="small" loading={busy === "test"} disabled={!canTest || !!busy} onClick={test}>
                Test{credential.verifiedAt || outcome ? " again" : ""}
              </Button>
            </Tooltip>
          )}
        </Result>
        <p className="hint">{testNote(credential)}</p>
      </Step>
      <Step aria-labelledby={`${id}-used`}>
        <header>
          <h3 id={`${id}-used`}>Used by</h3>
        </header>
        <Agents>
          {users.length === 0 ? (
            "No agents use this provider yet."
          ) : (
            <>
              {usage.named.length > 0 && (
                <>
                  Set on <b>{listed(usage.named.map((a) => a.name))}</b>.{" "}
                </>
              )}
              {usage.byDefault.length > 0 && (
                <>
                  The default for <b>{listed(usage.byDefault.map((a) => a.name))}</b>, which{" "}
                  {usage.byDefault.length === 1 ? "names" : "name"} no provider.
                </>
              )}
            </>
          )}
        </Agents>
      </Step>
      {own && (
        <RemoveSlot
          label={label}
          kind={credential.kind}
          usage={usage}
          busy={busy}
          onConfirm={remove}
        />
      )}
    </Form>
  );
}

const Danger = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  p {
    flex: 1;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

function RemoveSlot({
  label,
  kind,
  usage,
  busy,
  onConfirm,
}: {
  label: string;
  kind: Credential["kind"];
  usage: Usage;
  busy: Busy;
  onConfirm: () => void;
}) {
  const named = usage.named.map((a) => a.name);
  const fallback = usage.byDefault.map((a) => a.name);
  const effect =
    kind === "llm"
      ? "stop taking calls"
      : kind === "speech"
        ? "lose voice and phone calls (text calls carry on)"
        : "can no longer place phone calls";
  return (
    <Danger>
      <p>Disconnecting deletes the saved key. It cannot be recovered.</p>
      <Popconfirm
        title={`Disconnect ${label}?`}
        description={
          <div style={{ maxWidth: 300 }}>
            {named.length > 0 && (
              <p>
                <b>{listed(named)}</b> {named.length === 1 ? "is" : "are"} set to {label} and will{" "}
                {effect} until you pick another provider for {named.length === 1 ? "it" : "them"}.
              </p>
            )}
            {fallback.length > 0 && (
              <p>
                <b>{listed(fallback)}</b> {fallback.length === 1 ? "uses" : "use"} it by default and
                will move to another connected provider, or {effect} if there is none.
              </p>
            )}
            {named.length + fallback.length === 0 && <p>No agents use {label} right now.</p>}
            <p>The saved key and details are deleted and cannot be recovered.</p>
          </div>
        }
        placement="topRight"
        okText="Disconnect"
        okButtonProps={{ danger: true }}
        onConfirm={onConfirm}
      >
        <Button danger icon={<DeleteOutlined />} loading={busy === "remove"} disabled={!!busy && busy !== "remove"}>
          Disconnect
        </Button>
      </Popconfirm>
    </Danger>
  );
}

type Busy = "save" | "test" | "remove" | null;

export function ProviderDrawer({
  credential,
  usage,
  health,
  actions,
  onClose,
}: {
  // The provider shown; null closes the panel.
  credential: Credential | null;
  usage: Usage | null;
  health?: Health;
  actions: Actions;
  onClose: () => void;
}) {
  const { modal, message } = App.useApp();
  const formId = useId();
  const [busy, setBusy] = useState<Busy>(null);
  const [dirty, setDirty] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const own = credential?.source === "project";
  const telephony = credential?.kind === "telephony";

  const close = () => {
    setDirty(false);
    setReplacing(false);
    setBusy(null);
    onClose();
  };
  const askClose = () => {
    if (busy) return;
    if (!dirty) return close();
    modal.confirm({
      title: "Discard what you typed?",
      content: "Nothing has been saved yet.",
      okText: "Discard",
      cancelText: "Keep editing",
      onOk: close,
    });
  };

  return (
    <Drawer
      open={credential !== null}
      onClose={askClose}
      size={480}
      destroyOnHidden
      styles={{ wrapper: { maxWidth: "100vw" } }}
      title={
        credential && (
          <Title>
            <ProviderTile provider={credential.provider} label={credential.label} size={32} />
            <div>
              <h2>{credential.label}</h2>
              <small>{KIND_LABEL[credential.kind]}</small>
            </div>
            <span className="state">
              <StatusMark status={statusOf(credential)} busy={busy === "test"} />
            </span>
          </Title>
        )
      }
      footer={
        credential && (
          <Foot>
            <Button
              type="primary"
              htmlType="submit"
              form={formId}
              loading={busy === "save"}
              disabled={busy === "test" || busy === "remove" || (own && !dirty)}
            >
              {!own || replacing || telephony ? "Save and test" : "Save"}
            </Button>
            <Button onClick={askClose} disabled={!!busy}>
              Close
            </Button>
          </Foot>
        )
      }
    >
      {credential && usage && (
        <Editor
          key={credential.provider}
          credential={credential}
          usage={usage}
          health={health}
          actions={actions}
          formId={formId}
          onBusy={setBusy}
          onDirty={setDirty}
          onReplacing={setReplacing}
          onRemoved={() => {
            void message.success(`${credential.label} disconnected`);
            close();
          }}
        />
      )}
    </Drawer>
  );
}
