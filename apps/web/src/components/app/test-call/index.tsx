"use client";

import { Alert, App, Skeleton } from "antd";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { useAgent, useCredentials, useHealth } from "@/lib/api";
import { missingVariables, resolveModel } from "./parts";
import { isPhoneNumber, normalizeNumber, recallNumber, usePhoneCall } from "./phone";
import type { Mode } from "./state";
import { ConsoleRoot, TestConsole } from "./TestConsole";
import { useTestCall } from "./useTestCall";

const Placeholder = styled.div`
  max-width: 640px;
  padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)};
`;

// The Test tab: wires the console view to the agent, the server's health and
// a live call socket.
export function TestCall({ projectId, agentId }: { projectId: string; agentId: string }) {
  const { message } = App.useApp();
  const { data: agent, error } = useAgent(agentId);
  const { data: health } = useHealth(projectId);
  const { data: credentials } = useCredentials(projectId);
  const call = useTestCall(projectId, agentId);
  const phone = usePhoneCall(agent);
  // The console shows whichever kind of call was started last.
  const [showing, setShowing] = useState<"browser" | "phone">("browser");
  const [phoneTo, setPhoneTo] = useState(recallNumber);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [model, setModel] = useState("");

  // Each variable starts as its example until the tester types over it.
  const variables = useMemo(
    () => ({
      ...Object.fromEntries((agent?.flow.variables ?? []).map((v) => [v.name, v.example ?? ""])),
      ...edits,
    }),
    [agent, edits],
  );

  const onVariable = useCallback(
    (name: string, value: string) => setEdits((current) => ({ ...current, [name]: value })),
    [],
  );

  const { start, reset: resetBrowser } = call;
  const { place, reset: resetPhone } = phone;
  const onStart = useCallback(
    (mode: Mode) => {
      if (!agent) return;
      const missing = missingVariables(agent.flow, variables);
      if (missing.length) {
        void message.warning(`Fill in ${missing.join(", ")} before starting.`);
        return;
      }
      const sent = Object.fromEntries(
        agent.flow.variables.map((v) => [v.name, (variables[v.name] ?? "").trim()]),
      );
      if (mode === "phone") {
        if (!isPhoneNumber(phoneTo)) {
          void message.warning("Enter the number in international format, e.g. +919876543210.");
          return;
        }
        // The dialog has already had the tester confirm a real, billed call.
        resetBrowser();
        setShowing("phone");
        void place(normalizeNumber(phoneTo), sent);
        return;
      }
      resetPhone();
      setShowing("browser");
      void start({
        mode,
        variables: sent,
        model,
        resolvedModel: resolveModel(model, agent, health),
      });
    },
    [agent, health, message, model, phoneTo, place, resetBrowser, resetPhone, start, variables],
  );

  if (!agent) {
    return (
      <ConsoleRoot>
        <Placeholder>
          {error ? (
            <Alert
              type="error"
              showIcon
              title="This agent could not be loaded"
              description={error.message}
            />
          ) : (
            <Skeleton active paragraph={{ rows: 6 }} />
          )}
        </Placeholder>
      </ConsoleRoot>
    );
  }

  return (
    <TestConsole
      projectId={projectId}
      agent={agent}
      health={health}
      state={showing === "phone" && phone.state ? phone.state : call.state}
      credentials={credentials}
      phoneTo={phoneTo}
      onPhoneTo={setPhoneTo}
      variables={variables}
      model={model}
      mic={call.mic}
      onVariable={onVariable}
      onModel={setModel}
      onStart={onStart}
      onHangUp={call.hangUp}
      onSend={call.sendText}
    />
  );
}
