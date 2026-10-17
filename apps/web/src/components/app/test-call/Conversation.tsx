"use client";

import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  AudioOutlined,
  FileDoneOutlined,
  MessageOutlined,
  PhoneOutlined,
  RedoOutlined,
  SendOutlined,
  StopOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { App, Button, Input, type InputRef, Tag } from "antd";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { OutcomeTag, formatMs, modelLabel } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { routes } from "@/lib/routes";
import { ErrorHelp } from "./ErrorHelp";
import {
  ActivityBars,
  CallTimer,
  type ConsoleProps,
  Dot,
  fillTemplate,
  modeLabel,
  HangUpIcon,
  phaseLabel,
  TextLink,
  tint,
  voiceBlocker,
  ZoneHeader,
} from "./parts";
import {
  type ConsoleState,
  formatClock,
  hasDevanagari,
  isActive,
  type Line,
  type PhoneLeg,
} from "./state";

const Main = styled.main`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.color.canvas};
`;

const StatusText = styled.span`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};
  min-width: 0;
  white-space: nowrap;

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Spacer = styled.span`
  flex: 1;
`;

const Clocked = styled.span`
  ${type("label")}
  flex-shrink: 0;
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Activity = styled.span<{ $turn: boolean }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme, $turn }) => ($turn ? theme.color.accentText : theme.color.fgMuted)};
  white-space: nowrap;
`;

const Scroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable both-edges;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  max-width: 760px;
  min-height: 100%;
  margin-inline: auto;
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(4)};
`;

// ---- Transcript -------------------------------------------------------------

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;
const caret = keyframes`
  50% { opacity: 0; }
`;
const blink = keyframes`
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
`;

const Row = styled.li<{ $caller: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $caller }) => ($caller ? "flex-end" : "flex-start")};
  gap: ${({ theme }) => theme.space(1)};
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const Who = styled.span`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-inline: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
  font-variant-numeric: tabular-nums;
`;

const Bubble = styled.div<{ $caller: boolean; $hindi: boolean; $ghost?: boolean }>`
  max-width: min(85%, 560px);
  padding: ${({ theme }) => theme.space(1.75)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.raised};
  color: ${({ theme }) => theme.color.fg};
  font-size: 0.875rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  ${({ $caller, theme }) =>
    $caller
      ? css`
          border-color: ${tint(theme.color.accentLine, 22)};
          background: ${theme.color.accentSoft};
          border-bottom-right-radius: ${theme.space(0.5)};
        `
      : css`
          border-bottom-left-radius: ${theme.space(0.5)};
        `}

  ${({ $hindi, theme }) =>
    $hindi &&
    css`
      font-family: ${theme.font.hindi};
      line-height: 1.7;
    `}

  ${({ $ghost, theme }) =>
    $ghost &&
    css`
      border-style: dashed;
      border-color: ${tint(theme.color.accentLine, 35)};
      background: transparent;
      color: ${theme.color.fgMuted};
    `}
`;

const Caret = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accentLine};
  animation: ${caret} 1s steps(1) infinite;
`;

const CutOff = styled.span`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.warning};
`;

const Dots = styled.span`
  display: inline-flex;
  gap: ${({ theme }) => theme.space(1)};
  padding-block: ${({ theme }) => theme.space(1.5)};

  i {
    width: 6px;
    height: 6px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.fgMuted};
    animation: ${blink} 1.2s ease-in-out infinite;
  }
  i:nth-child(2) { animation-delay: 0.15s; }
  i:nth-child(3) { animation-delay: 0.3s; }
`;

const Lines = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
`;

// A hand-off to a person: not speech, so a note across the transcript.
const TransferNote = styled.li<{ $failed: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme, $failed }) => ($failed ? theme.color.warningSoft : theme.color.infoSoft)};
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  > .anticon {
    flex: none;
    margin-top: 3px;
    color: ${({ theme, $failed }) => ($failed ? theme.color.warning : theme.color.info)};
  }
  > div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(1)};
    min-width: 0;
  }
  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  blockquote {
    ${type("body")}
    margin: 0;
    padding-left: ${({ theme }) => theme.space(2.5)};
    border-left: 2px solid ${({ theme }) => theme.color.lineStrong};
    color: ${({ theme }) => theme.color.fg};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

function TransferMessage({ transfer }: { transfer: NonNullable<Line["transfer"]> }) {
  const failed = transfer.status === "failed";
  return (
    <TransferNote $failed={failed}>
      <UserSwitchOutlined />
      <div>
        {failed ? (
          <>
            <strong>
              Transfer to {transfer.to} failed{transfer.error ? `: ${transfer.error}` : ""}
            </strong>
            <span>The call carried on with the agent.</span>
          </>
        ) : (
          <>
            <strong>
              Transferred to {transfer.to}
              {transfer.status === "simulated" && " (simulated in test calls)"}
            </strong>
            <span>
              {transfer.status === "simulated"
                ? "Nobody is dialled in a test call. On a phone call, the person who answers would hear:"
                : "The person who answered heard:"}
            </span>
          </>
        )}
        {!failed && transfer.summary && (
          <blockquote lang={hasDevanagari(transfer.summary) ? "hi" : undefined}>
            {transfer.summary}
          </blockquote>
        )}
      </div>
    </TransferNote>
  );
}

function Message({ line, state }: { line: Line; state: ConsoleState }) {
  if (line.transfer) return <TransferMessage transfer={line.transfer} />;
  const caller = line.role === "caller";
  const timing = caller ? undefined : state.timings.find((t) => t.turn === line.turn);
  return (
    <Row $caller={caller}>
      <Who>{caller ? "You" : "Agent"}</Who>
      <Bubble
        $caller={caller}
        $hindi={hasDevanagari(line.text)}
        lang={hasDevanagari(line.text) ? "hi" : undefined}
      >
        {line.text}
        {line.interrupted && "\u00A0—"}
        {line.streaming && <Caret aria-hidden />}
      </Bubble>
      {(line.interrupted || timing) && (
        <Who>
          {line.interrupted && (
            <CutOff>
              <StopOutlined /> Interrupted by caller
            </CutOff>
          )}
          {timing && timing.llmMs !== null && <span>first text {formatMs(timing.llmMs)}</span>}
          {timing && timing.audioMs !== null && <span>first audio {formatMs(timing.audioMs)}</span>}
        </Who>
      )}
    </Row>
  );
}

// ---- Idle -------------------------------------------------------------------

const Centered = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.space(4)};
  width: 100%;
  max-width: 560px;
  margin-inline: auto;
  padding-block: ${({ theme }) => theme.space(2)};

  h3 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  .lede {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};

  li {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: ${({ theme }) => theme.space(3)};
    align-items: start;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
    border: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.accentText};
  }
  strong {
    ${type("label")}
    display: block;
    color: ${({ theme }) => theme.color.fg};
  }
  span {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Opening = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

function Idle({ agent, variables, health }: ConsoleProps) {
  const start = agent.flow.nodes.find((node) => node.id === agent.flow.start);
  const opening = start && "say" in start ? fillTemplate(start.say, variables) : null;
  const voice = voiceBlocker(agent, health) === null;
  return (
    <Centered>
      <div>
        <h3>Play the person being called</h3>
        <p className="lede">
          Start a call and answer as they would. The agent follows your flow in Hindi or English,
          and you watch it think: every step, every field it captures, and how fast it responds.
        </p>
      </div>
      <Steps>
        <li>
          <span className="icon">
            <PhoneOutlined />
          </span>
          <div>
            <strong>The agent speaks first</strong>
            <span>It greets you using the call details on the left.</span>
          </div>
        </li>
        <li>
          <span className="icon">{voice ? <AudioOutlined /> : <MessageOutlined />}</span>
          <div>
            <strong>{voice ? "You answer out loud or by typing" : "You answer by typing"}</strong>
            <span>
              {voice
                ? "Interrupt, go off-script, switch language. That is what the test is for."
                : "Go off-script, be vague, switch language. That is what the test is for."}
            </span>
          </div>
        </li>
        <li>
          <span className="icon">
            <FileDoneOutlined />
          </span>
          <div>
            <strong>The call is saved</strong>
            <span>When it ends you get the outcome and a link to the full record.</span>
          </div>
        </li>
      </Steps>
      {opening && (
        <Opening>
          <Who>The agent will open with</Who>
          <Bubble
            $caller={false}
            $hindi={hasDevanagari(opening)}
            lang={hasDevanagari(opening) ? "hi" : undefined}
          >
            {opening}
          </Bubble>
        </Opening>
      )}
    </Centered>
  );
}

function Blocked({ agent, projectId }: ConsoleProps) {
  const count = agent.issues.filter((issue) => issue.level === "error").length;
  return (
    <Centered>
      <div>
        <h3>Finish the flow to test it</h3>
        <p className="lede">
          {agent.name} has {count > 1 ? `${count} problems` : "a problem"} in its flow, so it
          cannot take calls yet. Fix {count > 1 ? "them" : "it"} in the Flow tab and this console
          unlocks straight away.
        </p>
      </div>
      <div>
        <TextLink href={routes.agent(projectId, agent.id)}>
          Open the Flow tab <ArrowRightOutlined />
        </TextLink>
      </div>
    </Centered>
  );
}

// ---- Ended ------------------------------------------------------------------

const EndCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
  margin-top: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  }
  h3 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  .meta {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  }
`;

function Ended({ state, projectId, onStart, health, agent }: ConsoleProps) {
  const { result, endReason, startedAt, endedAt, callId } = state;
  const duration = startedAt !== null && endedAt !== null ? formatClock(endedAt - startedAt) : null;
  const captured = Object.keys(result?.fields ?? state.call?.fields ?? {}).length;
  const turns = state.timings.length;

  const title =
    endReason === "hangup"
      ? "You hung up"
      : endReason === "error" || endReason === "dropped"
        ? state.phone && callId
          ? "Call not completed"
          : "Call failed"
        : "Call ended";
  // A call that died before the agent said anything has no numbers worth showing.
  const facts =
    turns > 0 || state.lines.length > 0
      ? [
          duration && `${duration} long`,
          `${turns} agent ${turns === 1 ? "turn" : "turns"}`,
          `${captured} ${captured === 1 ? "field" : "fields"} captured`,
        ].filter(Boolean)
      : [];
  // A voice call that failed for lack of speech is best retried as text.
  const again = state.mode === "voice" && voiceBlocker(agent, health) ? "text" : state.mode;

  return (
    <EndCard aria-live="polite">
      <div className="top">
        <h3>{title}</h3>
        {result ? (
          <OutcomeTag outcome={result.outcome} />
        ) : (
          endReason === "hangup" && <Tag variant="filled">Ended early</Tag>
        )}
      </div>
      {facts.length > 0 && <p className="meta">{facts.join(" · ")}</p>}
      {endReason === "hangup" && callId && (
        <p className="meta">
          The saved call records how far it got and the outcome the server assigned.
        </p>
      )}
      <div className="actions">
        <Button type="primary" icon={<RedoOutlined />} onClick={() => onStart(again)}>
          {again !== state.mode ? "Try a text call" : again === "phone" ? "Dial again" : "Call again"}
        </Button>
        {callId && (
          <TextLink href={routes.call(projectId, callId)}>
            View saved call <ArrowRightOutlined />
          </TextLink>
        )}
      </div>
    </EndCard>
  );
}

// ---- Footer: composer or voice bar -------------------------------------------

const Dock = styled.div`
  flex-shrink: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`;

const DockInner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  max-width: 760px;
  margin-inline: auto;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
`;

const VoiceText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Orb = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
`;

function Composer({ onSend, disabled }: { onSend: (text: string) => boolean; disabled: boolean }) {
  const { message } = App.useApp();
  const [draft, setDraft] = useState("");
  const input = useRef<InputRef>(null);

  useEffect(() => {
    if (!disabled) input.current?.focus({ preventScroll: true });
  }, [disabled]);

  const submit = () => {
    if (!draft.trim()) return;
    if (onSend(draft)) setDraft("");
    else void message.warning("Not connected, so your reply was not sent.");
    input.current?.focus();
  };

  return (
    <DockInner
      as="form"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        ref={input}
        value={draft}
        disabled={disabled}
        aria-label="Your reply"
        placeholder={disabled ? "Connecting…" : "Reply as the person being called…"}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button
        type="primary"
        htmlType="submit"
        icon={<SendOutlined />}
        disabled={disabled || !draft.trim()}
      >
        Send
      </Button>
    </DockInner>
  );
}

// ---- The zone ---------------------------------------------------------------

const Jump = styled.div`
  position: absolute;
  left: 50%;
  bottom: 68px;
  transform: translateX(-50%);
  z-index: 1;

  .ant-btn {
    box-shadow: ${({ theme }) => theme.shadow.pop};
  }
`;

const Connecting = styled.p`
  ${type("body")}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(3)};
  flex: 1;
  color: ${({ theme }) => theme.color.fgMuted};
`;

// ---- Phone call progress -------------------------------------------------------

const STAGES = ["Queued", "Ringing", "In progress", "Ended"] as const;
const STAGE_INDEX: Record<PhoneLeg["stage"], number> = {
  placing: 0,
  queued: 0,
  ringing: 1,
  in_progress: 2,
  ended: 3,
};
const STAGE_NOW: Record<PhoneLeg["stage"], string> = {
  placing: "Placing call to",
  queued: "Queued for",
  ringing: "Ringing",
  in_progress: "On the phone with",
  ended: "Ended",
};

const StageBox = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};

  p {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const StageRow = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
`;

const Stage = styled.li<{ $state: "done" | "now" | "next" }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme, $state }) =>
    ({ done: theme.color.fgMuted, now: theme.color.fg, next: theme.color.fgFaint })[$state]};

  &:not(:last-child)::after {
    content: "";
    width: ${({ theme }) => theme.space(5)};
    height: 1px;
    margin-left: ${({ theme }) => theme.space(1)};
    background: ${({ theme, $state }) =>
      $state === "done" ? theme.color.lineStrong : theme.color.line};
  }
`;

function PhoneStatus({ leg }: { leg: PhoneLeg }) {
  const at = STAGE_INDEX[leg.stage];
  const detail: Record<PhoneLeg["stage"], string> = {
    placing: `Asking the telephony provider to call ${leg.to}…`,
    queued: `The call to ${leg.to} is queued and should start ringing in a moment.`,
    ringing: `${leg.to} is ringing. Waiting for someone to answer.`,
    in_progress:
      "Someone answered. You cannot hear this call here: each exchange appears below once it has finished and been saved, so the transcript runs a turn behind.",
    ended: "",
  };
  return (
    <StageBox aria-label="Phone call progress" aria-live="polite">
      <StageRow>
        {STAGES.map((name, i) => {
          const stage = i < at ? "done" : i === at ? "now" : "next";
          return (
            <Stage key={name} $state={stage} aria-current={stage === "now" ? "step" : undefined}>
              <Dot $tone={stage !== "now" ? "idle" : leg.stage === "in_progress" ? "live" : "pending"} />
              {name}
            </Stage>
          );
        })}
      </StageRow>
      <p>{detail[leg.stage]}</p>
    </StageBox>
  );
}

function statusLine(state: ConsoleState): { tone: "live" | "pending" | "idle" | "error"; text: ReactNode } {
  const kind = modeLabel(state.mode);
  switch (state.status) {
    case "idle":
      return { tone: "idle", text: "No call in progress" };
    case "connecting":
      return state.phone
        ? {
            tone: "pending",
            text: (
              <>
                <b>{STAGE_NOW[state.phone.stage]}</b> {state.phone.to}
              </>
            ),
          }
        : { tone: "pending", text: <b>Connecting…</b> };
    case "live":
      return {
        tone: "live",
        text: (
          <>
            <b>Live</b> {kind}
            {state.phone ? ` · ${state.phone.to}` : ""}
            {!state.phone && state.model ? ` · ${modelLabel(state.model)}` : ""}
          </>
        ),
      };
    case "ended":
      return state.error
        ? { tone: "error", text: <b>{state.callId && state.phone ? "Call not completed" : "Call failed"}</b> }
        : { tone: "idle", text: <>{kind} ended</> };
  }
}

export function Conversation(props: ConsoleProps) {
  const { state, mic } = props;
  const active = isActive(state);
  const live = state.status === "live";
  const scroller = useRef<HTMLDivElement>(null);
  // Follow new messages unless the reader has scrolled up to look at older ones.
  const follow = useRef(true);
  const [away, setAway] = useState(false);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    follow.current = near;
    setAway(!near);
  };

  const toLatest = (smooth: boolean) => {
    const el = scroller.current;
    if (!el) return;
    follow.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  useLayoutEffect(() => {
    if (state.status === "connecting") follow.current = true;
    if (follow.current) toLatest(false);
  }, [state.lines, state.hearing, state.phase, state.status, state.error]);

  const status = statusLine(state);
  const thinking = live && state.phase === "thinking";
  const hearing = state.hearing.trim();

  return (
    <Main aria-label="Conversation" data-tour="test-conversation">
      <ZoneHeader>
        <h2>Conversation</h2>
        <StatusText aria-live="polite">
          <Dot $tone={status.tone} />
          <span>{status.text}</span>
        </StatusText>
        <Spacer />
        {/* A voice call shows this, larger, in the dock under the transcript. */}
        {live && state.mode === "text" && (
          <Activity $turn={state.phase === "listening"}>
            {state.phase !== "listening" && <ActivityBars phase={state.phase} />}
            {phaseLabel(state.phase, "text", false)}
          </Activity>
        )}
        {(live || (state.status === "ended" && state.lines.length > 0)) && (
          <Clocked>
            <CallTimer state={state} />
          </Clocked>
        )}
        {active && state.mode !== "phone" && (
          <Button
            danger
            type="primary"
            size="small"
            icon={<HangUpIcon />}
            onClick={props.onHangUp}
          >
            Hang up
          </Button>
        )}
      </ZoneHeader>

      <Scroller ref={scroller} onScroll={onScroll} tabIndex={0} aria-label="Transcript">
        <Column>
          {state.status === "idle" && (props.agent.ready ? <Idle {...props} /> : <Blocked {...props} />)}

          {state.phone && state.status !== "ended" && <PhoneStatus leg={state.phone} />}

          {state.status === "connecting" && !state.phone && (
            <Connecting>
              <Dot $tone="pending" />
              {state.mode === "voice"
                ? "Asking for your microphone and connecting…"
                : "Connecting to the agent…"}
            </Connecting>
          )}

          {state.lines.length > 0 && (
            <Lines role="log" aria-live="polite" aria-label="Call transcript">
              {state.lines.map((line) => (
                <Message key={line.id} line={line} state={state} />
              ))}
            </Lines>
          )}

          {hearing && (
            <Row as="div" $caller>
              <Who>You · hearing…</Who>
              <Bubble
                $caller
                $ghost
                $hindi={hasDevanagari(hearing)}
                lang={hasDevanagari(hearing) ? "hi" : undefined}
              >
                {hearing}…
              </Bubble>
            </Row>
          )}

          {thinking && (
            <Row as="div" $caller={false} aria-label="Agent is thinking">
              <Who>Agent</Who>
              <Bubble $caller={false} $hindi={false}>
                <Dots aria-hidden>
                  <i />
                  <i />
                  <i />
                </Dots>
              </Bubble>
            </Row>
          )}

          {state.error && <ErrorHelp {...props} message={state.error} />}
          {state.status === "ended" && <Ended {...props} />}
        </Column>
      </Scroller>

      {away && state.status !== "idle" && (
        <Jump>
          <Button shape="round" icon={<ArrowDownOutlined />} onClick={() => toLatest(true)}>
            Jump to latest
          </Button>
        </Jump>
      )}

      {active && state.mode === "text" && (
        <Dock>
          <Composer onSend={props.onSend} disabled={!live} />
        </Dock>
      )}
      {active && state.mode === "phone" && (
        <Dock>
          <DockInner>
            <Orb>
              <PhoneOutlined />
            </Orb>
            <VoiceText aria-live="polite">
              <strong>This call is on the phone line, not in this browser</strong>
              <span>
                The view refreshes every 2 seconds. To end the call, hang up on the phone; the
                console cannot end a phone call yet.
              </span>
            </VoiceText>
          </DockInner>
        </Dock>
      )}
      {active && state.mode === "voice" && (
        <Dock>
          <DockInner>
            <Orb>
              <ActivityBars phase={live ? state.phase : "thinking"} mic={mic} size={16} />
            </Orb>
            <VoiceText aria-live="polite">
              <strong>
                {live ? phaseLabel(state.phase, "voice", hearing !== "") : "Connecting…"}
              </strong>
              <span>
                {live
                  ? "Speak in Hindi or English. You can interrupt the agent at any time."
                  : "Allow microphone access if your browser asks."}
              </span>
            </VoiceText>
          </DockInner>
        </Dock>
      )}
    </Main>
  );
}
