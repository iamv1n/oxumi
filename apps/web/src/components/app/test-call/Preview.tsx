"use client";

import { CaretRightOutlined } from "@ant-design/icons";
import { Button, Segmented } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import {
  applyStep,
  begin,
  fixture,
  fixtureCredentials,
  type FixtureName,
  fixtureProjectId,
  FIXTURES,
  fixtureVariables,
  scriptedCall,
} from "./fixtures";
import { createLevel } from "./level";
import type { ConsoleState, Mode } from "./state";
import { TestConsole } from "./TestConsole";

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
`;

const Bar = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .states {
    overflow-x: auto;
    max-width: 100%;
  }
`;

// Stands in for the agent layout's content area.
const Slot = styled.div<{ $width?: number }>`
  flex: 1;
  min-height: 0;
  overflow: auto;
  width: 100%;
  max-width: ${({ $width }) => ($width ? `${$width}px` : "none")};
  margin-inline: auto;
`;

// The console over hand-written states, for reviewing what cannot be reached
// without LLM and speech keys. "Replay" streams the scripted call through the
// real reducer.
export function Preview({ name, width, bar }: { name: FixtureName; width?: number; bar: boolean }) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const base = fixture(name, now);
  const [replay, setReplay] = useState<ConsoleState | null>(null);
  const [variables, setVariables] = useState(fixtureVariables);
  const [model, setModel] = useState("");
  const [phoneTo, setPhoneTo] = useState("+919876543210");
  const [mic] = useState(() => createLevel(0.55));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const run = (mode: Mode) => {
    stop();
    // A phone call has no events to replay; show its ringing fixture.
    if (mode === "phone") {
      setReplay(null);
      router.replace("?state=phone-ringing");
      return;
    }
    let current = begin(mode, base.health.defaultModel, Date.now());
    setReplay(current);
    const next = (i: number) => {
      const step = scriptedCall[i];
      if (!step) return;
      timer.current = setTimeout(() => {
        // Text calls have no audio, so no first-audio timing either.
        const event =
          mode === "text" && step.event?.type === "turn"
            ? { ...step.event, audioMs: null }
            : step.event;
        current = applyStep(current, { ...step, event }, Date.now());
        setReplay(current);
        next(i + 1);
      }, Math.min(step.wait, 1600));
    };
    next(0);
  };

  const state = replay ?? base.state;

  return (
    <Frame>
      {bar && (
        <Bar>
          <strong>Test console preview</strong>
          <div className="states">
            <Segmented
              size="small"
              value={name}
              options={FIXTURES.map((value) => ({ value, label: value }))}
              onChange={(value) => {
                stop();
                setReplay(null);
                router.replace(`?state=${value}`);
              }}
            />
          </div>
          <Button size="small" icon={<CaretRightOutlined />} onClick={() => run("voice")}>
            Replay scripted call
          </Button>
        </Bar>
      )}
      <Slot $width={width}>
        <TestConsole
          projectId={fixtureProjectId}
          agent={base.agent}
          health={base.health}
          state={state}
          variables={variables}
          model={model}
          mic={mic}
          credentials={base.health.phone.ready ? fixtureCredentials : []}
          phoneTo={phoneTo}
          onPhoneTo={setPhoneTo}
          onVariable={(key, value) => setVariables((v) => ({ ...v, [key]: value }))}
          onModel={setModel}
          onStart={run}
          onHangUp={() => {
            stop();
            setReplay(null);
          }}
          onSend={() => true}
        />
      </Slot>
    </Frame>
  );
}
