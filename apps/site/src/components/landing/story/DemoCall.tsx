"use client";

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { glass } from "@/components/landing/kit";
import {
  EXAMPLE_LANGUAGES,
  type ExampleLanguage,
  useExampleLanguage,
} from "@/components/landing/language";
import { CALLS, resolve } from "./calls";
import type { NodeKind } from "./scenarios";
import { TICK_MS, frameAt, lastTick, type Status } from "./script";
import { SrOnly, tint, useReducedMotion } from "./shared";

// Illustrative calls played on a loop inside a product-style window: the
// transcript on the left, the record it produces on the right, the flow step
// in charge across the top. A switcher above picks the example.

const STATUS_LABEL: Record<Status, string> = {
  connecting: "Connecting",
  agent: "Agent speaking",
  caller: "Caller speaking",
  listening: "Listening",
  checking: "Checking the answer",
  ended: "Call ended",
};

const BARS = Array.from({ length: 28 }, (_, i) => ({
  // Deterministic pseudo-random shape so server and client markup agree.
  peak: 0.35 + (((i * 37) % 17) / 17) * 0.65,
  delay: ((i * 53) % 11) * 70,
  speed: 620 + ((i * 29) % 7) * 70,
}));

const DEVANAGARI = /[ऀ-ॿ]/;
const FLY_MS = 560;

const clock = (sec: number) => `00:${String(sec).padStart(2, "0")}`;

interface Playback {
  index: number;
  tick: number;
  language: ExampleLanguage;
}

type Action =
  | { type: "tick"; last: number }
  | { type: "pick"; index: number }
  | { type: "language"; language: ExampleLanguage };

function reduce(state: Playback, action: Action): Playback {
  if (action.type === "pick") return { ...state, index: action.index, tick: 0 };
  // A new language re-runs the same call from its first line.
  if (action.type === "language") return { ...state, language: action.language, tick: 0 };
  // A finished call hands over to the next example.
  if (state.tick >= action.last) {
    return { ...state, index: (state.index + 1) % CALLS.length, tick: 0 };
  }
  return { ...state, tick: state.tick + 1 };
}

// A row of pills whose selection is a pair of blobs under a gooey filter.
// They move at different speeds, so they stretch apart and merge again.
function GooGroup<T extends string>({
  kind,
  label,
  options,
  value,
  onChange,
}: {
  kind: "tabs" | "radio";
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current!;
    const place = () => {
      const on = root.querySelector<HTMLElement>('[data-on="true"]');
      if (!on) return;
      root.querySelectorAll<HTMLElement>("[data-blob]").forEach((blob) => {
        blob.style.width = `${on.offsetWidth}px`;
        blob.style.height = `${on.offsetHeight}px`;
        blob.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
        blob.style.opacity = "1";
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [value]);

  const quiet = kind === "radio";
  return (
    <Switcher
      ref={ref}
      role={kind === "tabs" ? "tablist" : "radiogroup"}
      aria-label={label}
      $quiet={quiet}
    >
      {/* Only the blobs sit inside the filtered layer; labels stay crisp above it. */}
      <BlobLayer aria-hidden="true">
        <Blob data-blob $slow={false} $quiet={quiet} />
        <Blob data-blob $slow $quiet={quiet} />
      </BlobLayer>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Tab
            key={option.id}
            type="button"
            role={kind === "tabs" ? "tab" : "radio"}
            {...(kind === "tabs" ? { "aria-selected": on } : { "aria-checked": on })}
            data-on={on}
            $on={on}
            $quiet={quiet}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Tab>
        );
      })}
    </Switcher>
  );
}

const CALL_TABS = CALLS.map((call) => ({ id: call.id, label: call.tab }));

export default function DemoCall() {
  const consoleRef = useRef<HTMLElement>(null);
  const flyers = useRef<(HTMLSpanElement | null)[]>([]);
  const landed = useRef({ scenario: "", keys: new Set<string>(), next: 0 });
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const { language, setLanguage } = useExampleLanguage();
  const [state, dispatch] = useReducer(reduce, { index: 0, tick: 0, language });
  // The language is chosen site-wide; when it changes, restart this call.
  if (state.language !== language) dispatch({ type: "language", language });

  const { index } = state;
  const tick = state.language === language ? state.tick : 0;
  const scenario = resolve(CALLS[index]!, language);
  const last = lastTick(scenario);
  const frame = frameAt(scenario, reduced ? last : tick);
  const activeIndex = scenario.steps.findIndex((step) => step.id === frame.activeStep);
  const filled = scenario.fields.filter((f) => frame.values[f.name]?.state === "ok").length;
  const speaking = frame.status === "agent" || frame.status === "caller";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry!.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(consoleRef.current!);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reduced) return;
    const id = setInterval(() => {
      if (!document.hidden) dispatch({ type: "tick", last });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [visible, reduced, last]);

  // When a value passes (or fails) its check, a chip flies from the words it
  // was read from to the field it belongs in.
  const landedKey = scenario.fields
    .map((f) => (frame.values[f.name] ? `${f.name}:${frame.values[f.name]!.state}` : ""))
    .join("|");
  useEffect(() => {
    const seen = landed.current;
    const keys = new Set(landedKey.split("|").filter(Boolean));
    const fresh = seen.scenario === scenario.id ? [...keys].filter((k) => !seen.keys.has(k)) : [];
    seen.scenario = scenario.id;
    seen.keys = keys;
    const root = consoleRef.current;
    if (!root || reduced || !fresh.length) return;

    const box = root.getBoundingClientRect();
    for (const key of fresh) {
      const [field, state] = key.split(":");
      const from = root.querySelector(`[data-anchor="${field}"]`)?.getBoundingClientRect();
      const to = root.querySelector(`[data-slot="${field}"]`)?.getBoundingClientRect();
      const chip = flyers.current[seen.next++ % flyers.current.length];
      if (!from || !to || !chip || !frame.values[field!]) continue;
      chip.textContent = frame.values[field!]!.value;
      chip.dataset.state = state;
      const a = { x: from.left - box.left, y: from.top - box.top - 4 };
      const b = { x: to.left - box.left, y: to.top - box.top };
      const lift = Math.min(a.y, b.y) - 28;
      chip.animate(
        [
          { transform: `translate(${a.x}px, ${a.y}px) scale(0.9)`, opacity: 0 },
          { transform: `translate(${a.x}px, ${a.y - 6}px) scale(1)`, opacity: 1, offset: 0.18 },
          {
            transform: `translate(${(a.x + b.x) / 2}px, ${Math.max(lift, (a.y + b.y) / 2 - 40)}px) scale(1.06)`,
            opacity: 1,
            offset: 0.6,
          },
          { transform: `translate(${b.x}px, ${b.y}px) scale(0.96)`, opacity: 0 },
        ],
        { duration: FLY_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
    }
    // Runs only when the set of checked values changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landedKey, scenario.id, reduced]);

  const summary =
    `Illustrative call, scripted for this page: ${scenario.title}. ` +
    `Fields collected: ${scenario.beats
      .flatMap((beat) => beat.captures ?? [])
      .filter((capture) => !capture.reject)
      .map((capture) => `${capture.field} ${capture.value}`)
      .join(", ")}. Outcome: ${scenario.outcome}.`;

  return (
    <div>
      <Goo aria-hidden="true">
        <filter id="story-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </Goo>

      <Console ref={consoleRef} aria-label={scenario.title}>
        <SrOnly as="figcaption">{summary}</SrOnly>

        <Chrome>
          <Lights aria-hidden="true">
            <i />
            <i />
            <i />
          </Lights>
          <GooGroup
            kind="tabs"
            label="Example calls"
            options={CALL_TABS}
            value={CALLS[index]!.id}
            onChange={(id) => dispatch({ type: "pick", index: CALLS.findIndex((c) => c.id === id) })}
          />
          <Languages>
            <GooGroup
              kind="radio"
              label="Language of the example call"
              options={EXAMPLE_LANGUAGES}
              value={language}
              onChange={setLanguage}
            />
            <Soon>More coming</Soon>
          </Languages>
          <DemoTag>Illustrative call</DemoTag>
        </Chrome>

        <div aria-hidden="true">
          <Rail>
            <RailLabel>Flow</RailLabel>
            {scenario.steps.map((step, i) => {
              const state =
                frame.ended || i < activeIndex ? "done" : i === activeIndex ? "active" : "idle";
              return (
                <RailStep key={step.id}>
                  <RailDot $state={state} $kind={step.kind}>
                    {state === "done" && <CheckOutlined />}
                  </RailDot>
                  <RailName $state={state}>{step.label}</RailName>
                  {i < scenario.steps.length - 1 && <RailLine $done={state === "done"} />}
                </RailStep>
              );
            })}
            <Clock>{clock(frame.elapsedSec)}</Clock>
          </Rail>

          <Body key={scenario.id}>
            <Talk>
              <Lines $static={reduced}>
                {frame.entries.map((entry, i) =>
                  entry.type === "note" ? (
                    <EngineNote key={i}>{entry.text}</EngineNote>
                  ) : (
                    <Row key={i} $role={entry.role}>
                      <Who>
                        {entry.role === "agent" ? (
                          <>
                            Agent<WhoStep>{entry.step}</WhoStep>
                          </>
                        ) : (
                          scenario.caller
                        )}
                      </Who>
                      <Bubble $role={entry.role} $cut={entry.cut && entry.done}>
                        {entry.words.map((word, w) => (
                          <Fragment key={w}>
                            <WordSpan
                              data-anchor={word.anchor}
                              $shown={word.shown}
                              $mark={word.mark}
                              $hindi={language === "hi" && DEVANAGARI.test(word.text)}
                            >
                              {word.text}
                              {word.mark && entry.words[w + 1]?.mark ? " " : ""}
                            </WordSpan>{" "}
                          </Fragment>
                        ))}
                        {entry.cut && <CutMark $shown={entry.done}>—</CutMark>}
                      </Bubble>
                    </Row>
                  ),
                )}
              </Lines>

              <StatusBar>
                <Wave $speaker={frame.status === "caller" ? "caller" : "agent"}>
                  {BARS.map((bar, i) => (
                    <Bar
                      key={i}
                      $on={speaking}
                      style={{
                        ["--peak" as string]: bar.peak,
                        animationDelay: `${bar.delay}ms`,
                        animationDuration: `${bar.speed}ms`,
                      }}
                    />
                  ))}
                </Wave>
                <StatusText>{STATUS_LABEL[frame.status]}</StatusText>
                <StatusNode>
                  <i>step </i>
                  <b>{frame.activeStep}</b>
                </StatusNode>
              </StatusBar>
            </Talk>

            <Result>
              <ResultHead>
                <ResultTitle>Structured result</ResultTitle>
                <Count>
                  {filled} / {scenario.fields.length} fields
                </Count>
              </ResultHead>

              <FieldList>
                {scenario.fields.map((field) => {
                  const value = frame.values[field.name];
                  const ok = value?.state === "ok";
                  const rejected = value?.state === "rejected";
                  const asking = !ok && !frame.ended && field.step === frame.activeStep;
                  return (
                    <FieldRow
                      key={field.name}
                      $state={ok ? "ok" : rejected ? "rejected" : asking ? "asking" : "idle"}
                    >
                      <FieldKey>
                        <FieldName $on={Boolean(value) || asking}>{field.name}</FieldName>
                        <FieldType>{field.type}</FieldType>
                      </FieldKey>
                      <Slot data-slot={field.name}>
                        {value ? (
                          <FieldValue key={`${value.state}-${value.value}`} $rejected={rejected}>
                            <span>{value.value}</span>
                            {rejected ? (
                              <Reason>
                                {value.reason}
                                <Verdict $ok={false}>
                                  <CloseOutlined />
                                </Verdict>
                              </Reason>
                            ) : (
                              <Verdict $ok>
                                <CheckOutlined />
                              </Verdict>
                            )}
                          </FieldValue>
                        ) : (
                          <FieldWaiting $asking={asking}>
                            {asking ? "listening for this" : "not yet asked"}
                          </FieldWaiting>
                        )}
                      </Slot>
                    </FieldRow>
                  );
                })}
              </FieldList>

              <Outcome>
                <OutcomeKey>outcome</OutcomeKey>
                {frame.outcome ? (
                  <OutcomePill key="done" $done>
                    {scenario.outcome}
                  </OutcomePill>
                ) : (
                  <OutcomePill $done={false}>in progress</OutcomePill>
                )}
              </Outcome>
            </Result>
          </Body>

          {[0, 1, 2].map((n) => (
            <Flyer
              key={n}
              ref={(el) => {
                flyers.current[n] = el;
              }}
            />
          ))}
        </div>
      </Console>
    </div>
  );
}

/* ---------- scenario switcher ---------- */

const Goo = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
`;

const Switcher = styled.div<{ $quiet: boolean }>`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme, $quiet }) => theme.space($quiet ? 0.5 : 2)};
`;

const Languages = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-left: ${({ theme }) => theme.space(1)};

  ${({ theme }) => theme.media.lg} {
    margin-left: auto;
    padding-left: ${({ theme }) => theme.space(4)};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const Soon = styled.span`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
  white-space: nowrap;
`;

const BlobLayer = styled.div`
  position: absolute;
  inset: 0;
  filter: url(#story-goo);
  pointer-events: none;
`;

const Blob = styled.span<{ $slow: boolean; $quiet: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $quiet }) => ($quiet ? theme.color.violet : theme.color.accent)};
  opacity: 0;
  transition:
    transform ${({ $slow }) => ($slow ? 720 : 420)}ms ${({ theme }) => theme.motion.ease},
    width ${({ $slow }) => ($slow ? 720 : 420)}ms ${({ theme }) => theme.motion.ease};
`;

const Tab = styled.button<{ $on: boolean; $quiet: boolean }>`
  ${type("label")}
  position: relative;
  padding: ${({ theme }) => theme.space(1.5)}
    ${({ theme, $quiet }) => theme.space($quiet ? 3 : 3.5)};
  border: 1px solid
    ${({ theme, $on, $quiet }) => ($on || $quiet ? "transparent" : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  color: ${({ theme, $on, $quiet }) =>
    !$on ? theme.color.fgMuted : $quiet ? theme.color.fg : theme.color.accentFg};
  font-weight: ${({ $on }) => ($on ? 600 : 500)};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme, $on, $quiet }) =>
      $on && !$quiet ? theme.color.accentFg : theme.color.fg};
  }
`;

const Console = styled.figure`
  ${glass}
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.panel};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

// A value in flight from the transcript to its field.
const Flyer = styled.span`
  ${type("code")}
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 0 24px ${({ theme }) => tint(theme.color.accent, 55)};
  color: ${({ theme }) => theme.color.accentFg};
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;

  &[data-state="rejected"] {
    background: ${({ theme }) => theme.color.danger};
    box-shadow: 0 0 24px ${({ theme }) => tint(theme.color.danger, 55)};
  }
`;

/* ---------- window chrome ---------- */

const Chrome = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => tint(theme.color.canvas, 55)};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const Lights = styled.span`
  display: none;
  flex: none;
  gap: ${({ theme }) => theme.space(1.5)};

  i {
    width: ${({ theme }) => theme.space(2.5)};
    height: ${({ theme }) => theme.space(2.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.lineStrong};
  }
  ${({ theme }) => theme.media.md} {
    display: flex;
  }
`;

const DemoTag = styled.span`
  ${type("caption")}
  flex: none;
  margin-left: auto;
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => tint(theme.color.accent, 35)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentText};
  white-space: nowrap;

  ${({ theme }) => theme.media.lg} {
    margin-left: 0;
  }
`;

const Clock = styled.span`
  ${type("code")}
  display: none;
  margin-left: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fgSubtle};
  font-variant-numeric: tabular-nums;

  ${({ theme }) => theme.media.md} {
    display: inline;
  }
`;

/* ---------- flow rail ---------- */

type StepState = "idle" | "active" | "done";

const Rail = styled.div`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => tint(theme.color.canvas, 45)};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const RailLabel = styled.span`
  ${type("overline")}
  display: none;
  margin-right: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fgSubtle};

  ${({ theme }) => theme.media.lg} {
    display: block;
  }
`;

const RailStep = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  /* Every step but the last stretches so its connector fills the gap. */
  flex: 1 1 auto;
  min-width: 0;

  &:last-child {
    flex: none;
  }
`;

const RailDot = styled.span<{ $state: StepState; $kind: NodeKind }>`
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.space(4.5)};
  height: ${({ theme }) => theme.space(4.5)};
  border-radius: ${({ theme, $kind }) => ($kind === "branch" ? theme.space(1) : theme.radius.pill)};
  transform: ${({ $kind }) => ($kind === "branch" ? "rotate(45deg) scale(0.86)" : "none")};
  border: 1.5px solid
    ${({ theme, $state, $kind }) =>
      $state === "idle" ? theme.color.lineStrong : theme.color.node[$kind]};
  background: ${({ theme, $state, $kind }) =>
    $state === "active"
      ? theme.color.node[$kind]
      : $state === "done"
        ? tint(theme.color.node[$kind], 16)
        : "transparent"};
  box-shadow: ${({ theme, $state, $kind }) =>
    $state === "active" ? `0 0 0 4px ${tint(theme.color.node[$kind], 22)}` : "none"};
  color: ${({ theme, $kind }) => theme.color.node[$kind]};
  font-size: ${({ theme }) => theme.space(2.25)};
  transition:
    background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  .anticon {
    transform: ${({ $kind }) => ($kind === "branch" ? "rotate(-45deg)" : "none")};
  }
`;

const RailName = styled.span<{ $state: StepState }>`
  ${type("label")}
  /* Narrow screens name only the step in charge. */
  display: ${({ $state }) => ($state === "active" ? "block" : "none")};
  color: ${({ theme, $state }) =>
    $state === "active"
      ? theme.color.fg
      : $state === "done"
        ? theme.color.fgMuted
        : theme.color.fgSubtle};
  white-space: nowrap;
  transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  ${({ theme }) => theme.media.md} {
    display: block;
  }
`;

const RailLine = styled.span<{ $done: boolean }>`
  flex: 1;
  min-width: ${({ theme }) => theme.space(2)};
  height: 1px;
  margin-right: ${({ theme }) => theme.space(2)};
  background: ${({ theme, $done }) => ($done ? theme.color.fgFaint : theme.color.line)};
  transition: background ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

/* ---------- body ---------- */

const Body = styled.div`
  display: grid;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  }
`;

const Talk = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
`;

const Lines = styled.div<{ $static: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(3)};
  overflow: hidden;
  padding: ${({ theme }) => theme.space(4)};
  /* A fixed stage: older lines slide up and fade out under the top edge. */
  height: ${({ theme, $static }) => ($static ? "auto" : theme.space(76))};
  mask-image: ${({ theme, $static }) =>
    $static ? "none" : `linear-gradient(to bottom, transparent 0, ${theme.color.canvas} 22%)`};

  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.space(3.5)};
    height: ${({ theme, $static }) => ($static ? "auto" : theme.space(86))};
    padding: ${({ theme }) => theme.space(6)};
  }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
`;

const Row = styled.div<{ $role: "agent" | "caller" }>`
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: ${({ $role }) => ($role === "caller" ? "flex-end" : "flex-start")};
  gap: ${({ theme }) => theme.space(1)};
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease} both;
`;

const Who = styled.span`
  ${type("caption")}
  padding-inline: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const WhoStep = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgFaint};

  &::before {
    content: " · ";
  }
`;

const Bubble = styled.p<{ $role: "agent" | "caller"; $cut: boolean }>`
  ${type("body")}
  opacity: ${({ $cut }) => ($cut ? 0.55 : 1)};
  transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  max-width: 88%;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  border: 1px solid
    ${({ theme, $role }) => ($role === "agent" ? tint(theme.color.accent, 22) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  border-top-left-radius: ${({ theme, $role }) =>
    $role === "agent" ? theme.space(1) : theme.radius.card};
  border-top-right-radius: ${({ theme, $role }) =>
    $role === "caller" ? theme.space(1) : theme.radius.card};
  background: ${({ theme, $role }) =>
    $role === "agent"
      ? `linear-gradient(135deg, ${tint(theme.color.accent, 13)}, ${tint(theme.color.pink, 7)})`
      : theme.color.overlay};
  color: ${({ theme }) => theme.color.fg};

  ${({ theme }) => theme.media.md} {
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.lede.line};
    max-width: 82%;
  }
`;

const WordSpan = styled.span<{
  $shown: boolean;
  $mark: "ok" | "rejected" | null;
  $hindi: boolean;
}>`
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  font-family: ${({ theme, $hindi }) => ($hindi ? theme.font.hindi : "inherit")};
  color: ${({ theme, $mark }) =>
    $mark === "ok" ? theme.color.accentTextHover : $mark ? theme.color.danger : "inherit"};
  /* The phrase a value was read from is underlined once the value is checked. */
  text-decoration: underline 1.5px;
  text-decoration-style: ${({ $mark }) => ($mark === "rejected" ? "wavy" : "solid")};
  text-underline-offset: 5px;
  text-decoration-color: ${({ theme, $mark }) =>
    $mark === "ok"
      ? tint(theme.color.accentLine, 70)
      : $mark
        ? tint(theme.color.danger, 80)
        : "transparent"};
  transition:
    opacity ${({ theme }) => theme.motion.fast} linear,
    color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    text-decoration-color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const CutMark = styled.span<{ $shown: boolean }>`
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
`;

// What the engine did between two lines.
const EngineNote = styled.p`
  ${type("caption")}
  display: flex;
  flex: none;
  align-items: center;
  align-self: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  border: 1px dashed ${({ theme }) => tint(theme.color.violet, 55)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => tint(theme.color.violet, 10)};
  color: ${({ theme }) => theme.color.fg};
  text-align: center;
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease} both;

  &::before {
    content: "";
    flex: none;
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.violet};
  }
`;

/* ---------- status bar ---------- */

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const wave = keyframes`
  0%, 100% { transform: scaleY(0.18); }
  50% { transform: scaleY(var(--peak)); }
`;

const Wave = styled.span<{ $speaker: "agent" | "caller" }>`
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  height: ${({ theme }) => theme.space(6)};
  color: ${({ theme, $speaker }) =>
    $speaker === "agent" ? theme.color.accentLine : theme.color.fg};
  transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  /* Fewer bars where space is tight. */
  & > :nth-child(n + 11) {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    & > :nth-child(n + 11) {
      display: block;
    }
  }
`;

const Bar = styled.span<{ $on: boolean }>`
  width: 2px;
  height: 100%;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: currentColor;
  opacity: ${({ $on }) => ($on ? 1 : 0.35)};
  transform: scaleY(0.12);
  animation-name: ${({ $on }) => ($on ? wave : "none")};
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const StatusText = styled.span`
  ${type("label")}
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.color.fgMuted};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusNode = styled.span`
  ${type("caption")}
  flex: none;
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgSubtle};

  i {
    display: none;
    font-style: normal;
  }
  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  ${({ theme }) => theme.media.sm} {
    i {
      display: inline;
    }
  }
`;

/* ---------- structured result ---------- */

const Result = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  /* Tall enough for the longest field list, so every example is one size. */
  min-height: ${({ theme }) => theme.space(94)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => tint(theme.color.canvas, 55)};

  ${({ theme }) => theme.media.md} {
    min-height: 0;
    padding: ${({ theme }) => theme.space(6)};
    border-top: 0;
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const ResultHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

const ResultTitle = styled.p`
  ${type("overline")}
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Count = styled.span`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const FieldList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const land = keyframes`
  0% { opacity: 0; transform: translateY(-10px) scale(0.96); filter: blur(4px); }
  60% { opacity: 1; transform: translateY(1px) scale(1.01); filter: blur(0); }
  100% { opacity: 1; transform: none; }
`;

type FieldState = "idle" | "asking" | "ok" | "rejected";

const FieldRow = styled.div<{ $state: FieldState }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  min-height: ${({ theme }) => theme.space(11)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid
    ${({ theme, $state }) =>
      ({
        idle: theme.color.line,
        asking: tint(theme.color.accent, 45),
        ok: theme.color.lineStrong,
        rejected: tint(theme.color.danger, 50),
      })[$state]};
  border-style: ${({ $state }) => ($state === "idle" ? "dashed" : "solid")};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $state }) =>
    ({
      idle: "transparent",
      asking: tint(theme.color.accent, 6),
      ok: theme.color.raised,
      rejected: tint(theme.color.danger, 7),
    })[$state]};
  transition:
    background ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease};

`;

const Slot = styled.div`
  min-width: 0;
`;

const FieldKey = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2.5)};
  min-width: 0;
`;

const FieldName = styled.span<{ $on: boolean }>`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme, $on }) => ($on ? theme.color.fgMuted : theme.color.fgSubtle)};
  transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const FieldType = styled.span`
  ${type("caption")}
  display: none;
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgFaint};

  ${({ theme }) => theme.media.md} {
    display: inline;
  }
`;

const FieldValue = styled.div<{ $rejected: boolean }>`
  ${type("code")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fg};
  /* Held back until the chip flying over from the transcript arrives. */
  animation: ${land} 620ms ${({ theme }) => theme.motion.ease} ${FLY_MS - 140}ms both;

  & > span:first-child {
    overflow: hidden;
    color: ${({ theme, $rejected }) => ($rejected ? theme.color.fgSubtle : "inherit")};
    text-decoration: ${({ $rejected }) => ($rejected ? "line-through" : "none")};
    text-overflow: ellipsis;
    white-space: nowrap;
    /* A rejected value gives its room to the reason on narrow screens. */
    display: ${({ $rejected }) => ($rejected ? "none" : "inline")};
  }
  ${({ theme }) => theme.media.sm} {
    & > span:first-child {
      display: inline;
    }
  }
`;

const Reason = styled.span`
  ${type("caption")}
  display: flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.danger};
`;

const Verdict = styled.span<{ $ok: boolean }>`
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.space(4)};
  height: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $ok }) => ($ok ? theme.color.successSoft : theme.color.dangerSoft)};
  color: ${({ theme, $ok }) => ($ok ? theme.color.success : theme.color.danger)};
  font-size: ${({ theme }) => theme.space(2.25)};
`;

const blink = keyframes`
  50% { opacity: 0.25; }
`;

const FieldWaiting = styled.div<{ $asking: boolean }>`
  ${type("caption")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme, $asking }) => ($asking ? theme.color.accentText : theme.color.fgFaint)};
  white-space: nowrap;

  &::before {
    content: "";
    display: ${({ $asking }) => ($asking ? "block" : "none")};
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: currentColor;
    animation: ${blink} 1s ease-in-out infinite;
  }
`;

const Outcome = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.space(4)};
  padding-top: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const OutcomeKey = styled.span`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const OutcomePill = styled.span<{ $done: boolean }>`
  ${type("caption")}
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-family: ${({ theme }) => theme.font.mono};
  background: ${({ theme, $done }) => ($done ? theme.color.successSoft : theme.color.hover)};
  color: ${({ theme, $done }) => ($done ? theme.color.success : theme.color.fgSubtle)};
  animation: ${({ $done }) => ($done ? land : "none")} 620ms
    ${({ theme }) => theme.motion.ease} both;
`;
