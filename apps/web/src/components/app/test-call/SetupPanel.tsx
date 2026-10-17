"use client";

import {
  ArrowRightOutlined,
  AudioOutlined,
  MessageOutlined,
  PhoneOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Alert, Button, Input, Select, Tooltip } from "antd";
import { useId } from "react";
import styled from "styled-components";
import { Overline, modelLabel } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { SidePanel, WIDE } from "./Collapsible";
import { routes } from "@/lib/routes";
import {
  CallTimer,
  type ConsoleProps,
  Dot,
  HangUpIcon,
  missingVariables,
  modeLabel,
  providerOf,
  resolveModel,
  speechFor,
  TextLink,
  voiceBlocker,
  ZoneHeader,
} from "./parts";
import { phoneBlocker } from "./phone";
import { isActive } from "./state";

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(4)};
`;

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
`;

const GroupHint = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
  margin-top: -${({ theme }) => theme.space(1)};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};

  label {
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  /* Locked during a call, but still what the agent was told: keep it legible. */
  && input:disabled,
  && .ant-select-disabled .ant-select-content,
  && .ant-select-disabled .ant-select-selection-item {
    color: ${({ theme }) => theme.color.fgMuted};
    -webkit-text-fill-color: currentColor;
  }
`;

const Caution = styled.p`
  ${type("caption")}
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: ${({ theme }) => theme.space(2)};
  line-height: 1.6;
  color: ${({ theme }) => theme.color.fgMuted};

  .anticon {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.warning};
  }
  strong {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const IssueList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  margin: ${({ theme }) => theme.space(1)} 0 ${({ theme }) => theme.space(3)};
  padding-left: ${({ theme }) => theme.space(4)};
  list-style: disc;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  flex-shrink: 0;
`;

const Reason = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
  line-height: 1.5;
`;

const Reasons = styled.ul`
  ${type("caption")}
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
  line-height: 1.5;

  strong {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const LiveCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};

  .status {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .clock {
    ${type("heading")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;


// The collapsed panel's summary: call status, or the ways to start one.
const SlimStatus = styled.span`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};

  @container (min-width: ${WIDE}) {
    flex-direction: column;
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

const SlimActions = styled.span`
  display: inline-flex;
  gap: ${({ theme }) => theme.space(2)};

  @container (min-width: ${WIDE}) {
    flex-direction: column;
    margin-top: ${({ theme }) => theme.space(2)};
  }
`;

export function SetupPanel(props: ConsoleProps & { open: boolean; onToggle: () => void }) {
  const { projectId, agent, health, state, variables, model } = props;
  const formId = useId();
  const active = isActive(state);
  const { flow } = agent;

  const resolved = resolveModel(model, agent, health);
  const provider = providerOf(resolved, health);
  const providerDown = provider && !provider.available;
  const integrations = routes.integrations(projectId);

  const blockedVoice = voiceBlocker(agent, health);
  const speech = speechFor(agent, health);
  const missing = missingVariables(flow, variables);
  const blockedAll = !agent.ready
    ? "Fix the flow before starting a call."
    : missing.length
      ? "Fill in every call detail first."
      : null;
  const voiceReason = blockedAll ?? blockedVoice;
  // Without speech, text is the way to test, so it takes the primary slot.
  const voiceFirst = !blockedVoice;

  // A real phone call: the number and the warning live in the dialog.
  const onPhone = state.mode === "phone";
  const phoneBlock = phoneBlocker(agent, health);
  const phoneReason =
    phoneBlock?.reason ?? (missing.length ? "Fill in every call detail first." : null);

  const defaultLabel = agent.model
    ? `Agent's model · ${modelLabel(agent.model)}`
    : `Server default${health ? ` · ${modelLabel(health.defaultModel)}` : ""}`;
  const modelOptions = [
    { value: "", label: defaultLabel },
    ...(health?.providers ?? []).map((p) => ({
      label: p.available ? p.label : `${p.label} · not connected`,
      title: p.label,
      options: p.models.length
        ? p.models.map((option) => ({
            value: option.ref,
            label: option.label,
            disabled: !p.available,
          }))
        : [{ value: `${p.id}:`, label: "No models listed", disabled: true }],
    })),
  ];

  const voiceButton = (
    <Tooltip title={voiceReason} placement="right">
      <Button
        block
        type={voiceFirst ? "primary" : "default"}
        icon={<AudioOutlined />}
        disabled={voiceReason !== null}
        onClick={() => props.onStart("voice")}
      >
        Start voice call
      </Button>
    </Tooltip>
  );
  const textButton = (
    <Tooltip title={blockedAll} placement="right">
      <Button
        block
        type={voiceFirst ? "default" : "primary"}
        icon={<MessageOutlined />}
        disabled={blockedAll !== null}
        onClick={() => props.onStart("text")}
      >
        Start text call
      </Button>
    </Tooltip>
  );

  const slim = active ? (
    <>
      <span className="grow" />
      <SlimStatus>
        <Dot $tone={state.status === "live" ? "live" : "pending"} />
        <CallTimer state={state} />
      </SlimStatus>
      {!onPhone && (
        <SlimActions>
        <Tooltip title="Hang up" placement="right">
          <Button
            danger
            type="primary"
            shape="circle"
            aria-label="Hang up"
            icon={<HangUpIcon />}
            onClick={props.onHangUp}
          />
        </Tooltip>
      </SlimActions>
      )}
    </>
  ) : (
    <>
      <span className="grow" />
      <SlimActions>
        <Tooltip title={voiceReason ?? "Start voice call"} placement="right">
          <Button
            shape="circle"
            type={voiceFirst ? "primary" : "default"}
            aria-label="Start voice call"
            icon={<AudioOutlined />}
            disabled={voiceReason !== null}
            onClick={() => props.onStart("voice")}
          />
        </Tooltip>
        <Tooltip title={blockedAll ?? "Start text call"} placement="right">
          <Button
            shape="circle"
            type={voiceFirst ? "default" : "primary"}
            aria-label="Start text call"
            icon={<MessageOutlined />}
            disabled={blockedAll !== null}
            onClick={() => props.onStart("text")}
          />
        </Tooltip>
        <Tooltip title={phoneReason ?? "Call a phone"} placement="right">
          <Button
            shape="circle"
            aria-label="Call a phone"
            icon={<PhoneOutlined />}
            disabled={phoneReason !== null}
            onClick={() => props.onStart("phone")}
          />
        </Tooltip>
      </SlimActions>
    </>
  );

  return (
    <SidePanel
      open={props.open}
      side="left"
      name="setup"
      label="Setup"
      width={300}
      slim={slim}
      onToggle={props.onToggle}
    >
      {(toggle) => (
        <>
      <ZoneHeader>
        <h2>Setup</h2>
        <span className="grow" />
        {toggle}
      </ZoneHeader>

      <Body>
        {!agent.ready && (
          <Alert
            type="warning"
            showIcon
            title="This agent can't take calls yet"
            description={
              <>
                <IssueList>
                  {agent.issues.length ? (
                    agent.issues.map((issue) => <li key={issue.message}>{issue.message}</li>)
                  ) : (
                    <li>The flow has errors.</li>
                  )}
                </IssueList>
                <TextLink href={routes.agent(projectId, agent.id)}>
                  Open the Flow tab <ArrowRightOutlined />
                </TextLink>
              </>
            }
          />
        )}

        <Group data-tour="test-variables">
          <Overline as="h3">Call details</Overline>
          {flow.variables.length ? (
            <>
              <GroupHint>What the agent knows before it dials.</GroupHint>
              {flow.variables.map((variable) => {
                const id = `${formId}-${variable.name}`;
                const empty = !variables[variable.name]?.trim();
                return (
                  <Field key={variable.name}>
                    <label htmlFor={id}>{variable.description || variable.name}</label>
                    <Input
                      id={id}
                      value={variables[variable.name] ?? ""}
                      placeholder={variable.example ?? variable.name}
                      disabled={active}
                      status={empty && !active ? "warning" : undefined}
                      autoComplete="off"
                      onChange={(e) => props.onVariable(variable.name, e.target.value)}
                    />
                  </Field>
                );
              })}
            </>
          ) : (
            <GroupHint>This flow takes no variables.</GroupHint>
          )}
        </Group>

        <Group data-tour="test-model">
          <Overline as="h3">Model</Overline>
          <Field>
            <label htmlFor={`${formId}-model`}>Run this call on</label>
            <Select
              id={`${formId}-model`}
              value={model}
              options={modelOptions}
              disabled={active}
              loading={!health}
              onChange={props.onModel}
              popupMatchSelectWidth={false}
            />
          </Field>
          {providerDown && (
            <Caution role="status">
              <WarningFilled />
              <span>
                <strong>{provider.label} is not connected.</strong> Calls on this model will
                not get through. <TextLink href={integrations}>Add its key under Integrations</TextLink> or
                pick another model.
              </span>
            </Caution>
          )}
        </Group>
      </Body>

      <Footer data-tour="test-start">
        {active ? (
          <>
            <LiveCard aria-live="polite">
              <Dot $tone={state.status === "live" ? "live" : "pending"} />
              <div className="status">
                <strong>
                  {state.status === "live"
                    ? "Live"
                    : state.phone?.stage === "ringing"
                      ? "Ringing…"
                      : state.phone
                        ? "Dialling…"
                        : "Connecting…"}
                </strong>
                <small>
                  {modeLabel(state.mode)}
                  {state.mode === "voice" && speech ? ` · ${speech.label}` : ""}
                  {onPhone && state.phone ? ` · ${state.phone.to}` : ""}
                  {!onPhone && state.model ? ` · ${modelLabel(state.model)}` : ""}
                </small>
              </div>
              <span className="clock">
                <CallTimer state={state} />
              </span>
            </LiveCard>
            {onPhone ? (
              <Reason>
                This call is on the phone line. It ends when either side hangs up; the console
                cannot end a phone call yet.
              </Reason>
            ) : (
              <Button
                block
                danger
                type="primary"
                icon={<HangUpIcon />}
                onClick={props.onHangUp}
              >
                Hang up
              </Button>
            )}
          </>
        ) : (
          <>
            {voiceFirst ? voiceButton : textButton}
            {voiceFirst ? textButton : voiceButton}
            <Tooltip title={phoneReason} placement="right">
              <Button
                block
                data-tour="test-phone"
                icon={<PhoneOutlined />}
                disabled={phoneReason !== null}
                onClick={() => props.onStart("phone")}
              >
                Call a phone…
              </Button>
            </Tooltip>
            {blockedAll ? (
              <Reason>{blockedAll}</Reason>
            ) : (
              <Reasons>
                {blockedVoice && health && (
                  <li>
                    <strong>Voice:</strong> {blockedVoice}
                  </li>
                )}
                {phoneBlock && health && (
                  <li>
                    <strong>Phone:</strong> {phoneBlock.reason}
                  </li>
                )}
                {(blockedVoice || phoneBlock?.fix === "integrations") && health ? (
                  <li>
                    <TextLink href={integrations}>
                      Open Integrations <ArrowRightOutlined />
                    </TextLink>
                  </li>
                ) : (
                  <li>
                    You play the person being called.
                    {speech?.available && ` Voice calls use ${speech.label}.`} A phone call dials
                    a real number.
                  </li>
                )}
              </Reasons>
            )}
          </>
        )}
      </Footer>
        </>
      )}
    </SidePanel>
  );
}
