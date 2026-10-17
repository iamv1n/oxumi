"use client";

import { CheckCircleFilled, MinusCircleOutlined } from "@ant-design/icons";
import { Form, Input, Select } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { ProviderName } from "@/components/app/integrations/logos/ProviderLogo";
import type { AgentDetail, Credential, Health } from "@/lib/api";
import { routes } from "@/lib/routes";

// The option that holds each provider's project-wide calling number.
const DEFAULT_NUMBER_OPTION: Record<string, string> = {
  twilio: "fromNumber",
  exotel: "callerId",
  vobiz: "fromNumber",
};
const NUMBER_NOTE: Record<string, string> = {
  twilio: "It must be a number your Twilio account owns.",
  exotel: "It must be an ExoPhone on your Exotel account.",
  vobiz: "It must be a number on your Vobiz account.",
};

// The same rule the server applies: spaces, brackets and dashes are dropped,
// and what is left must be digits with an optional leading +.
export const cleanNumber = (raw: string) => raw.replace(/[\s()\-]/g, "");
export const NUMBER_ERROR = "The calling number must be digits, optionally starting with +.";
export const isCallingNumber = (raw: string) => {
  const cleaned = cleanNumber(raw);
  return cleaned === "" || /^\+?\d+$/.test(cleaned);
};

export interface TelephonyState {
  // Telephony credentials, as the project has them.
  providers: Credential[];
  // Why a provider cannot be used yet, or null when it is complete.
  reason: (credential: Credential) => string | null;
  // The provider this agent's calls will use, if any is usable.
  effective: Credential | undefined;
  // The project-level number of the effective provider.
  defaultNumber: string;
  // One line for the collapsed section.
  summary: string;
}

export function describeTelephony(
  health: Health | undefined,
  credentials: Credential[] | undefined,
  telephony: string,
  phoneNumber: string,
): TelephonyState {
  const providers = (credentials ?? []).filter((c) => c.kind === "telephony");
  const complete = new Set(health?.phone.providers ?? []);

  const reason = (credential: Credential): string | null => {
    if (complete.has(credential.provider)) return null;
    if (credential.source === null) return "not connected";
    if (credential.missing.length > 0) {
      const labels = credential.missing.map(
        (name) => credential.optionFields.find((f) => f.name === name)?.label ?? name,
      );
      return `needs ${labels.join(", ")}`;
    }
    return "not ready";
  };

  const chosen = telephony
    ? providers.find((c) => c.provider === telephony)
    : providers.find((c) => complete.has(c.provider));
  const effective = chosen && complete.has(chosen.provider) ? chosen : undefined;
  const defaultNumber =
    (chosen && chosen.options[DEFAULT_NUMBER_OPTION[chosen.provider] ?? ""]) || "";

  const name = telephony
    ? (providers.find((c) => c.provider === telephony)?.label ?? telephony)
    : "Project default";
  const number = cleanNumber(phoneNumber) || defaultNumber;
  const state = chosen ? reason(chosen) : "not connected";
  const summary = `${name} · ${state ?? (number || "no calling number")}`;

  return { providers, reason, effective, defaultNumber, summary };
}

const Pair = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0 ${({ theme }) => theme.space(5)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
`;

const Unavailable = styled.span`
  margin-left: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Block = styled.div`
  margin-top: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};

  & + & {
    margin-top: ${({ theme }) => theme.space(3)};
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  > p {
    ${type("label")}
    font-weight: 400;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  a {
    border-radius: ${({ theme }) => theme.radius.control};
    color: ${({ theme }) => theme.color.accentText};
    font-weight: 500;
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
`;

const Checks = styled.ul`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(5)};
  margin-top: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  li {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    align-items: start;
    gap: ${({ theme }) => theme.space(2)};
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fg};
  }
  .anticon {
    margin-top: 3px;
    font-size: 14px;
  }
  .ok {
    color: ${({ theme }) => theme.color.success};
  }
  .no {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  small {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Verdict = styled.span<{ $ok: boolean }>`
  ${type("caption")}
  font-weight: 500;
  margin-left: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $ok }) => ($ok ? theme.color.successSoft : theme.color.warningSoft)};
  color: ${({ theme, $ok }) => ($ok ? theme.color.success : theme.color.warning)};
`;

function Check({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  // Shown when the item is not in place: what is wrong and where to fix it.
  detail?: ReactNode;
}) {
  return (
    <li>
      {ok ? (
        <CheckCircleFilled className="ok" aria-label="In place" />
      ) : (
        <MinusCircleOutlined className="no" aria-label="Missing" />
      )}
      <span>
        {label}
        {!ok && detail && <small>{detail}</small>}
      </span>
    </li>
  );
}

// The fields and status of the Configuration page's Telephony section. Must
// be rendered inside the page's Form.
export function TelephonySection({
  agent,
  health,
  state,
  telephony,
  modelReady,
}: {
  agent: AgentDetail;
  health: Health | undefined;
  state: TelephonyState;
  // The provider currently chosen in the form ("" for the project default).
  telephony: string;
  // Whether the agent's language model can be used right now.
  modelReady: boolean;
}) {
  const integrations = routes.integrations(agent.projectId);
  const { providers, reason, effective, defaultNumber } = state;
  const unusable = providers.filter((c) => reason(c) !== null);
  const chosen = telephony ? providers.find((c) => c.provider === telephony) : effective;
  const fallback = providers.find((c) => reason(c) === null);
  const reachable = health?.phone.serverReachable ?? false;
  const speech = health?.voice ?? false;
  const ready = agent.ready && modelReady && speech && Boolean(effective) && reachable;

  return (
    <>
      <Pair>
        <Form.Item
          name="telephony"
          label="Phone provider"
          extra={
            unusable.length > 0 ? (
              <>
                {unusable.map((c) => `${c.label}: ${reason(c)}`).join(". ")}.{" "}
                <Link href={integrations}>Set up in Integrations</Link>
              </>
            ) : (
              "The service that places this agent's phone calls."
            )
          }
        >
          <Select
            options={[
              {
                value: "",
                label: `Project default${fallback ? ` (${fallback.label})` : ""}`,
              },
              ...providers.map((c) => {
                const why = reason(c);
                return {
                  value: c.provider,
                  // Keep an unusable provider selectable only if it is already chosen.
                  disabled: why !== null && c.provider !== telephony,
                  label: (
                    <>
                      <ProviderName provider={c.provider} label={c.label} />
                      {why && <Unavailable>{why}</Unavailable>}
                    </>
                  ),
                };
              }),
            ]}
          />
        </Form.Item>
        <Form.Item
          name="phoneNumber"
          label="Calling number"
          extra={
            <>
              {defaultNumber
                ? `Leave empty to use the project's number: ${defaultNumber}.`
                : "Optional. Leave empty to use the number saved with the provider in Integrations."}{" "}
              {chosen ? NUMBER_NOTE[chosen.provider] : ""}
            </>
          }
          rules={[
            {
              validator: (_, value: string) =>
                isCallingNumber(value ?? "")
                  ? Promise.resolve()
                  : Promise.reject(new Error(NUMBER_ERROR)),
            },
          ]}
        >
          <Input
            placeholder={defaultNumber || "+14155550123"}
            inputMode="tel"
            autoComplete="off"
            spellCheck={false}
            allowClear
          />
        </Form.Item>
      </Pair>

      <Block data-tour="config-phone-readiness">
        <h3>
          Phone calls for this agent
          <Verdict $ok={ready}>{ready ? "Ready" : "Not ready yet"}</Verdict>
        </h3>
        <Checks>
          <Check
            ok={agent.ready}
            label="Flow is ready"
            detail={
              <>
                It has open issues. <Link href={routes.agent(agent.projectId, agent.id)}>Fix them in Flow</Link>
              </>
            }
          />
          <Check
            ok={modelReady}
            label="Language model"
            detail={
              <>
                Its provider is not connected. <Link href={integrations}>Integrations</Link>
              </>
            }
          />
          <Check
            ok={speech}
            label="Speech provider"
            detail={
              <>
                None connected, so the agent has no voice. <Link href={integrations}>Integrations</Link>
              </>
            }
          />
          <Check
            ok={Boolean(effective)}
            label={`Phone provider${effective ? ` (${effective.label})` : ""}`}
            detail={
              <>
                {chosen ? `${chosen.label}: ${reason(chosen)}.` : "None connected."}{" "}
                <Link href={integrations}>Integrations</Link>
              </>
            }
          />
          <Check
            ok={reachable}
            label="Server reachable from the internet"
            detail="Phone calls cannot be placed from this server yet. Whoever runs it needs to give it a public address."
          />
        </Checks>
      </Block>

      <Block>
        <h3>How calls are started</h3>
        <p>
          Your own software places a call through the{" "}
          <Link href={routes.projectApi(agent.projectId)}>API</Link>, or you ring a number
          yourself from the <Link href={routes.agentTest(agent.projectId, agent.id)}>Test tab</Link>.
          A request that names a provider uses that one; otherwise the choice above applies, then
          the project&apos;s first connected provider.
        </p>
      </Block>
    </>
  );
}
