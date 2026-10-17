"use client";

import { PhoneOutlined, WarningFilled } from "@ant-design/icons";
import { Input, Modal } from "antd";
import { useId } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { routes } from "@/lib/routes";
import { type ConsoleProps, TextLink } from "./parts";
import { isPhoneNumber, phoneFrom } from "./phone";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(3)};

  label {
    ${type("label")}
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Help = styled.p<{ $error?: boolean }>`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme, $error }) => ($error ? theme.color.danger : theme.color.fgSubtle)};
`;

const Facts = styled.dl`
  ${type("caption")}
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgSubtle};

  dd {
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// The one thing nobody should miss before dialling.
const RealCall = styled.p`
  ${type("body")}
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.warning};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.warningSoft};
  color: ${({ theme }) => theme.color.fg};

  .anticon {
    margin-top: 4px;
    color: ${({ theme }) => theme.color.warning};
  }
  strong {
    font-weight: 600;
  }
`;

// Where a real phone call is set up: the number, where it comes from, and
// what placing it costs. Nothing is dialled until "Call now".
export function PhoneDialog({
  open,
  onClose,
  onCall,
  ...props
}: ConsoleProps & { open: boolean; onClose: () => void; onCall: () => void }) {
  const id = useId();
  const { agent, health, projectId, phoneTo } = props;
  const typed = phoneTo.trim();
  const valid = isPhoneNumber(typed);
  const from = phoneFrom(agent, health, props.credentials);

  return (
    <Modal
      open={open}
      title="Call a phone"
      okText="Call now"
      okButtonProps={{ disabled: !valid, icon: <PhoneOutlined /> }}
      cancelText="Cancel"
      onOk={onCall}
      onCancel={onClose}
      destroyOnHidden
      width={440}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onCall();
        }}
      >
        <div>
          <label htmlFor={`${id}-to`}>Number to call</label>
          <Input
            id={`${id}-to`}
            autoFocus
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+919876543210"
            value={phoneTo}
            status={typed && !valid ? "error" : undefined}
            aria-describedby={`${id}-help`}
            onChange={(e) => props.onPhoneTo(e.target.value)}
          />
          <Help id={`${id}-help`} $error={typed !== "" && !valid}>
            {typed && !valid
              ? "Use international format: + and the country code, e.g. +919876543210."
              : "International format, with + and the country code."}
          </Help>
        </div>

        <Facts>
          <dt>Calls from</dt>
          <dd>
            {from
              ? `${from.label} · ${from.number ?? "its default number"}`
              : "the connected telephony provider"}{" "}
            <TextLink href={routes.agentConfig(projectId, agent.id)}>Change</TextLink>
          </dd>
          <dt>Says</dt>
          <dd>
            The flow, with the call details from Setup. It runs on the agent&apos;s own model; the
            model picked in Setup is for browser tests.
          </dd>
        </Facts>

        <RealCall role="note">
          <WarningFilled />
          <span>
            <strong>This dials a real person.</strong> The call is billed by your telephony and
            speech providers, and it fires this project&apos;s webhooks like any other call (see{" "}
            <TextLink href={routes.projectApi(projectId)}>API, Webhooks tab</TextLink>).
          </span>
        </RealCall>
      </Form>
    </Modal>
  );
}
