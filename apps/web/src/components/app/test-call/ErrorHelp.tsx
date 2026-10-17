"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import { Alert } from "antd";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { API_URL } from "@/lib/api";
import { routes } from "@/lib/routes";
import { Code, type ConsoleProps, providerOf, TextLink } from "./parts";
import { classifyError } from "./state";

// Ant's alert with a description is roomy; this one sits in a dense console.
const Notice = styled(Alert)`
  && {
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    border-radius: ${({ theme }) => theme.radius.card};
  }
  .ant-alert-title,
  .ant-alert-message {
    ${type("label")}
    font-size: 0.875rem;
    margin-bottom: ${({ theme }) => theme.space(1)};
  }
  .ant-alert-icon {
    font-size: 16px;
    margin-top: 2px;
  }
`;

const Help = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(2)};

  p {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
    max-width: 60ch;
  }
  ol {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(1.5)};
    padding-left: ${({ theme }) => theme.space(5)};
    list-style: decimal;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Raw = styled.details`
  width: 100%;

  summary {
    ${type("caption")}
    width: fit-content;
    cursor: pointer;
    color: ${({ theme }) => theme.color.fgSubtle};
    border-radius: ${({ theme }) => theme.radius.control};
  }
  summary:hover {
    color: ${({ theme }) => theme.color.fgMuted};
  }
  pre {
    ${type("code")}
    margin: ${({ theme }) => theme.space(2)} 0 0;
    padding: ${({ theme }) => theme.space(3)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fgMuted};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

// Turns whatever the server said into something the tester can act on. The
// server's own words stay available underneath.
export function ErrorHelp({
  message,
  state,
  health,
  agent,
  projectId,
}: ConsoleProps & { message: string }) {
  const kind = classifyError(
    message,
    state.endReason,
    state.mode === "phone" && state.callId !== null,
  );
  let title: ReactNode = "The call stopped with an error";
  let body: ReactNode = <p>{message}</p>;
  let showRaw = false;
  let tone: "error" | "warning" = "error";

  const integrations = (
    <TextLink href={routes.integrations(projectId)}>
      Open Integrations <ArrowRightOutlined />
    </TextLink>
  );

  if (kind === "llm_credentials") {
    // The server names the provider ("OpenAI is not connected…"); otherwise
    // it is the one behind the model the call ran on.
    const named = message.match(/^(.+?) is not connected/)?.[1];
    const provider = named ?? providerOf(state.model, health)?.label;
    const others = (health?.providers ?? []).filter((p) => p.available && p.label !== provider);
    title = `${provider ?? "The model provider"} is not connected, so the agent could not respond`;
    showRaw = true;
    body = (
      <>
        <p>
          {state.callId ? "The call connected, but" : "The call was not started:"} this project has
          no working API key for the model it {state.callId ? "ran" : "would run"} on. Nothing is
          wrong with your flow.
        </p>
        <ol>
          <li>
            Add {provider ? `${provider}\u2019s` : "the provider\u2019s"} API key on the
            project&apos;s Integrations page.
          </li>
          {others.length > 0 && (
            <li>Or pick a model from {others.map((p) => p.label).join(" or ")} under Model.</li>
          )}
          <li>Choose Call again.</li>
        </ol>
        {integrations}
      </>
    );
  } else if (kind === "voice_credentials") {
    tone = "warning";
    title = "No speech provider is connected";
    body = (
      <>
        <p>
          A voice call needs speech recognition and a voice. Connect ElevenLabs or Sarvam under
          Integrations, or test the same flow by typing in the meantime.
        </p>
        {integrations}
      </>
    );
  } else if (kind === "phone_outcome") {
    tone = "warning";
    title = message;
    body = (
      <p>
        The call to {state.phone?.to || "that number"} was placed but ended before the flow
        finished. Anything said before that is in the saved call.
      </p>
    );
  } else if (kind === "phone_unreachable") {
    tone = "warning";
    title = "This server cannot place phone calls yet";
    showRaw = true;
    body = (
      <p>
        During a phone call the telephony provider connects back to the server, and this server
        has no public URL configured. That is a server setting (PUBLIC_URL), not something in
        your project, so whoever runs the server has to set it. Voice and text tests in the
        browser do not need it.
      </p>
    );
  } else if (kind === "telephony_credentials") {
    tone = "warning";
    title = "No telephony provider is connected";
    showRaw = true;
    body = (
      <>
        <p>
          A phone call is placed through Twilio, Exotel or Vobiz. Connect one, with its calling number,
          under Integrations.
        </p>
        {integrations}
      </>
    );
  } else if (kind === "phone_number") {
    tone = "warning";
    title = "That number is not in international format";
    body = (
      <p>
        Write it with a + and the country code and no leading zero, for example{" "}
        <Code>+919876543210</Code>. Nothing was dialled.
      </p>
    );
  } else if (kind === "microphone") {
    tone = "warning";
    title = "The microphone is not available";
    body = (
      <p>
        Allow microphone access for this site in your browser&apos;s address bar and check that an
        input device is connected, then call again. You can also test by typing.
      </p>
    );
  } else if (kind === "not_ready") {
    title = "This agent's flow is not ready";
    body = (
      <>
        <p>{message}</p>
        <TextLink href={routes.agent(projectId, agent.id)}>
          Open the Flow tab <ArrowRightOutlined />
        </TextLink>
      </>
    );
  } else if (kind === "variables") {
    tone = "warning";
    title = "Some call details are empty";
    body = <p>{message}. Fill them in under Call details and start again.</p>;
  } else if (kind === "signed_out") {
    tone = "warning";
    title = "You are signed out";
    body = (
      <>
        <p>Your session has ended, so the call was not started. Sign in and try again.</p>
        <TextLink href={routes.login}>
          Sign in <ArrowRightOutlined />
        </TextLink>
      </>
    );
  } else if (kind === "connection") {
    title = message;
    body = (
      <p>
        Check that the API is running at <Code>{API_URL}</Code>. If the call had already started,
        whatever was captured before the drop is in the saved call.
      </p>
    );
  }

  return (
    <Notice
      type={tone}
      showIcon
      title={title}
      description={
        <Help>
          {body}
          {showRaw && (
            <Raw>
              <summary>What the server said</summary>
              <pre>{message}</pre>
            </Raw>
          )}
        </Help>
      }
    />
  );
}
