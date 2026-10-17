"use client";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import styled, { css } from "styled-components";
import { color } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { mix, Pill, Stage, StageNote, usePhase } from "./shared";

// Looping example of one question going round the loop twice: the engine asks,
// the model words it and proposes a value, validation rejects a vague answer,
// the engine asks again, and only the valid value is kept.

const QUESTION_1 = "Which day works better for you?";
const QUESTION_2 = "Could you give me a day and a time?";
const ANSWER_1 = "Sometime next week";
const ANSWER_2 = "Thursday, 11:30";

type Focus = "engine" | "agent" | "value" | "gate";
const FOCUS: Focus[] = ["engine", "agent", "value", "gate", "agent", "value", "gate", "engine"];

const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.15fr);
    align-items: stretch;
  }
`;

const Lane = styled.div<{ $on: boolean; $tone: string }>`
  --lane: ${({ $tone }) => $tone};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ $on, theme }) => ($on ? mix("var(--lane)", 45) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: 0 0 ${({ theme }) => theme.space(8)} ${({ $on }) => mix("var(--lane)", $on ? 12 : 0)};
  transition:
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const LaneHead = styled.div`
  ${type("overline")}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};

  em {
    font-style: normal;
    color: var(--lane);
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(1)};
`;

const Step = styled.li<{ $state: "done" | "now" | "todo"; $kind: string }>`
  ${type("code")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgSubtle};
  transition:
    background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  i {
    flex: none;
    width: ${({ theme }) => theme.space(12)};
    font-style: normal;
    color: ${({ $kind }) => $kind};
    opacity: ${({ $state }) => ($state === "todo" ? 0.55 : 1)};
  }
  b {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-weight: inherit;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    ${type("caption")}
    flex: none;
  }

  ${({ $state, theme }) =>
    $state === "now" &&
    css`
      border-color: ${mix(theme.color.accent, 40)};
      background: ${theme.color.accentSoft};
      color: ${theme.color.fg};
      span {
        color: ${theme.color.accentText};
      }
    `}
  ${({ $state, theme }) =>
    $state === "done" &&
    css`
      color: ${theme.color.fgMuted};
      span {
        color: ${theme.color.success};
      }
    `}
`;

const Wires = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.space(5)};

  ${({ theme }) => theme.media.sm} {
    flex-direction: column;
    width: ${({ theme }) => theme.space(22)};
    gap: ${({ theme }) => theme.space(6)};
  }
`;

const Wire = styled.div<{ $on: boolean }>`
  ${type("caption")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ $on, theme }) => ($on ? theme.color.fg : theme.color.fgFaint)};
  transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  .anticon {
    color: ${({ $on, theme }) => ($on ? theme.color.accentText : "inherit")};
    transform: rotate(90deg);
  }

  ${({ theme }) => theme.media.sm} {
    flex-direction: column;
    text-align: center;
    .anticon {
      transform: none;
    }
  }
`;

const Line = styled.div<{ $on: boolean }>`
  opacity: ${({ $on }) => ($on ? 1 : 0.4)};
  transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  small {
    ${type("overline")}
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Bubble = styled.p<{ $on: boolean }>`
  ${type("body")}
  display: flex;
  align-items: center;
  min-height: ${({ theme }) => theme.space(11)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ $on, theme }) => ($on ? mix("var(--lane)", 55) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  border-top-left-radius: ${({ theme }) => theme.space(1)};
  background: ${({ $on }) => mix("var(--lane)", $on ? 16 : 7)};
  color: ${({ theme }) => theme.color.fg};
  transition:
    background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const Mono = styled.p`
  ${type("code")}
  min-height: ${({ theme }) => theme.text.code.line};
  color: ${({ theme }) => theme.color.fg};
  overflow-wrap: anywhere;

  i {
    font-style: normal;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Models = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px dashed ${({ theme }) => theme.color.line};

  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Gate = styled.div<{ $verdict: "wait" | "no" | "yes"; $on: boolean }>`
  --verdict: ${({ $verdict, theme }) =>
    $verdict === "yes"
      ? theme.color.success
      : $verdict === "no"
        ? theme.color.danger
        : theme.color.fgSubtle};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-top: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ $on, theme }) => ($on ? mix("var(--verdict)", 55) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ $on }) => mix("var(--verdict)", $on ? 10 : 4)};
  transition:
    background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const GateLabel = styled.span`
  ${type("overline")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Verdict = styled.span`
  ${type("code")}
  display: inline-flex;
  flex: 1 1 ${({ theme }) => theme.space(60)};
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-height: ${({ theme }) => theme.space(10)};
  color: ${({ theme }) => theme.color.fg};

  .anticon {
    color: var(--verdict);
  }
  i {
    font-style: normal;
    color: var(--verdict);
  }
`;

export default function EngineExample() {
  const [ref, phase] = usePhase<HTMLElement>(FOCUS.length, 1700);
  const focus = FOCUS[phase]!;
  const advanced = phase === 7;
  const question = phase < 1 ? null : phase < 4 ? QUESTION_1 : QUESTION_2;
  const answer = phase < 2 ? null : phase < 5 ? ANSWER_1 : ANSWER_2;
  const verdict = phase === 3 || phase === 4 ? "no" : phase >= 6 ? "yes" : "wait";

  const steps = [
    { kind: color.node.say, verb: "say", name: "greeting", state: "done" },
    { kind: color.node.ask, verb: "ask", name: "visit_status", state: "done" },
    { kind: color.node.ask, verb: "ask", name: "new_slot", state: advanced ? "done" : "now" },
    { kind: color.node.ask, verb: "ask", name: "reason", state: advanced ? "now" : "todo" },
    { kind: color.node.end, verb: "end", name: "wrap_up", state: "todo" },
  ] as const;

  return (
    <Stage ref={ref} aria-label="Diagram of one question passing between the flow engine, the language model and validation">
      <Layout>
        <Lane $on={focus === "engine"} $tone={color.accentText}>
          <LaneHead>
            Flow engine <em>decides</em>
          </LaneHead>
          <Steps>
            {steps.map((step) => (
              <Step key={step.name} $state={step.state} $kind={step.kind}>
                <i>{step.verb}</i>
                <b>{step.name}</b>
                <span>
                  {step.state === "done" && <CheckOutlined aria-label="done" />}
                  {step.state === "now" && (phase >= 4 && !advanced ? "asking again" : "asking")}
                </span>
              </Step>
            ))}
          </Steps>
        </Lane>

        <Wires aria-hidden="true">
          <Wire $on={focus === "agent" || phase === 0}>
            question
            <ArrowRightOutlined />
          </Wire>
          <Wire $on={focus === "value"}>
            <ArrowLeftOutlined />
            proposed value
          </Wire>
        </Wires>

        <Lane $on={focus === "agent" || focus === "value"} $tone={color.violet}>
          <LaneHead>
            Language model <em>speaks</em>
          </LaneHead>
          <Line $on={question !== null}>
            <small>Words the question</small>
            <Bubble $on={focus === "agent"}>{question ?? "…"}</Bubble>
          </Line>
          <Line $on={answer !== null}>
            <small>Proposes a value from the reply</small>
            <Mono>
              <i>new_slot ← </i>
              {answer ? `"${answer}"` : "…"}
            </Mono>
          </Line>
          <Models>
            <Pill>Anthropic</Pill>
            <Pill>OpenAI</Pill>
            <Pill>Gemini</Pill>
            <small>chosen per agent</small>
          </Models>
        </Lane>
      </Layout>

      <Gate $verdict={verdict} $on={focus === "gate" || advanced}>
        <GateLabel>
          <SafetyCertificateOutlined aria-hidden="true" />
          Validation
        </GateLabel>
        <Verdict aria-live="off">
          {verdict === "wait" && <i>waiting for a value</i>}
          {verdict === "no" && (
            <>
              <CloseOutlined aria-hidden="true" />
              <span>
                &quot;{ANSWER_1}&quot; is not a day and time. <i>Not kept. Ask again.</i>
              </span>
            </>
          )}
          {verdict === "yes" && (
            <>
              <CheckOutlined aria-hidden="true" />
              <span>
                &quot;{ANSWER_2}&quot; is a valid slot. <i>Kept. Move to the next step.</i>
              </span>
            </>
          )}
        </Verdict>
      </Gate>

      <StageNote>
        <b>Diagram</b>
        Looping example of one question. Step and field names are illustrative.
      </StageNote>
    </Stage>
  );
}
