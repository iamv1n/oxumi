"use client";

import { ArrowRightOutlined, CheckOutlined, ExportOutlined, MinusOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import {
  type AgentSummary,
  type ApiKey,
  type Health,
  type Webhook,
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { START_STEPS } from "./codeViews";
import { Box, BoxHead, ViewHeader } from "./ui";

// Where an integration begins: what must be in place before a call can be
// placed, then the three steps of the real flow. The chosen step decides
// what the code panel shows.

type Check = "done" | "todo" | "unknown";

const Checklist = styled.ul`
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)};
    min-height: ${({ theme }) => theme.space(10)};
    padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(4)};
  }
  li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  .what {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  .detail {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 400;
  }
  ${({ theme }) => theme.media.sm} {
    .detail {
      display: inline;
      margin-left: ${({ theme }) => theme.space(2)};
    }
  }
  a,
  button {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    padding: 0;
    border: 0;
    border-radius: ${({ theme }) => theme.radius.small};
    background: none;
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }
  a:hover,
  button:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
  .anticon {
    font-size: 10px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;

const Mark = styled.span<{ $check: Check }>`
  display: grid;
  place-items: center;
  width: ${({ theme }) => theme.space(4.5)};
  height: ${({ theme }) => theme.space(4.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $check }) =>
    $check === "done"
      ? theme.color.successSoft
      : $check === "todo"
        ? theme.color.warningSoft
        : theme.color.hover};
  color: ${({ theme, $check }) =>
    $check === "done"
      ? theme.color.success
      : $check === "todo"
        ? theme.color.warning
        : theme.color.fgFaint};

  && .anticon {
    font-size: 10px;
  }
`;

const Progress = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  i {
    display: block;
    width: ${({ theme }) => theme.space(16)};
    height: 3px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.line};
    overflow: hidden;
  }
  i::after {
    content: "";
    display: block;
    width: var(--done);
    height: 100%;
    background: ${({ theme }) => theme.color.success};
  }
`;

const Steps = styled.ol`
  display: grid;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Step = styled.button<{ $on: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(3)};
  align-content: start;
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 0;
  border-top: 2px solid ${({ theme, $on }) => ($on ? theme.color.accentLine : "transparent")};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : "transparent")};
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : theme.color.hover)};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }

  .n {
    ${type("code")}
    grid-row: span 2;
    color: ${({ theme, $on }) => ($on ? theme.color.accentText : theme.color.fgSubtle)};
    font-size: ${({ theme }) => theme.text.caption.size};
  }
  .title {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  .summary {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const StepItem = styled.li`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  ${({ theme }) => theme.media.sm} {
    & + & {
      border-top: 0;
      border-left: 1px solid ${({ theme }) => theme.color.line};
    }
  }
`;

const Detail = styled.div`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  p {
    ${type("label")}
    max-width: 44rem;
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
  p code {
    ${type("code")}
    font-size: ${({ theme }) => theme.text.caption.size};
    padding: 0 ${({ theme }) => theme.space(1)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
    margin-top: ${({ theme }) => theme.space(2)};
  }
  a {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    border-radius: ${({ theme }) => theme.radius.small};
    color: ${({ theme }) => theme.color.accentText};
    font-weight: 500;
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
  a .anticon {
    font-size: 10px;
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
`;

const DETAILS: { text: ReactNode; links: { href: string; label: string }[] }[] = [
  {
    text: (
      <>
        <code>POST /v1/calls</code> with the agent, the number in international format and a value
        for each of the agent&apos;s variables. Whatever you put in <code>metadata</code> comes
        back unchanged in the webhook, so you can match the result to your own record. The answer
        is immediate (<code>202</code>) and carries the call&apos;s id.
      </>
    ),
    links: [
      { href: routes.docs("placing-calls"), label: "Placing calls" },
      { href: routes.docs("errors"), label: "Errors" },
    ],
  },
  {
    text: (
      <>
        We ring the number through your phone provider and the agent runs its flow. Nothing is
        needed from you while it runs. If you want to look, <code>GET /v1/calls/:id</code> returns
        its status, and after it ends its outcome, answers and transcript.
      </>
    ),
    links: [{ href: routes.docs("reference"), label: "API reference" }],
  },
  {
    text: (
      <>
        When the call ends, <code>call.completed</code> is posted to each enabled webhook with the
        outcome, the collected answers and the transcript. Verify the{" "}
        <code>Oxumi-Signature</code> header, answer with any 2xx within 10 seconds, and do slow
        work afterwards. A delivery that fails is retried for about seven hours.
      </>
    ),
    links: [
      { href: routes.docs("webhooks"), label: "Webhooks" },
      { href: routes.docs("conversations"), label: "Text conversations" },
    ],
  },
];

export function GetStarted({
  projectId,
  agents,
  health,
  keys,
  webhooks,
  step,
  onStep,
  onSection,
}: {
  projectId: string;
  // Each is undefined until it has loaded.
  agents?: AgentSummary[];
  health?: Health;
  keys?: ApiKey[];
  webhooks?: Webhook[];
  // The step of the flow being read; drives the code panel.
  step: number;
  onStep: (step: number) => void;
  onSection: (section: "keys" | "webhooks") => void;
}) {
  const state = (ready: boolean | undefined): Check =>
    ready === undefined ? "unknown" : ready ? "done" : "todo";
  const readyAgents = agents?.filter((agent) => agent.ready).length;
  const models = health?.providers.filter((p) => p.available).map((p) => p.label);
  const speech = health?.speech.filter((s) => s.available).map((s) => s.label);
  const workingKeys = keys?.filter((k) => k.status === "active" || k.status === "expiring").length;
  const liveHooks = webhooks?.filter((w) => w.enabled).length;
  const integrations = routes.integrations(projectId);

  const checks: { what: string; detail: string; check: Check; action: ReactNode }[] = [
    {
      what: "An agent that is ready",
      detail:
        readyAgents === undefined
          ? "Checking"
          : readyAgents
            ? `${readyAgents} ready in this project`
            : "No agent's flow is complete yet",
      check: state(readyAgents === undefined ? undefined : readyAgents > 0),
      action: <Link href={routes.agents(projectId)}>Agents</Link>,
    },
    {
      what: "A language model",
      detail: models === undefined ? "Checking" : models.length ? models.join(", ") : "Not connected",
      check: state(models === undefined ? undefined : models.length > 0),
      action: <Link href={integrations}>Integrations</Link>,
    },
    {
      what: "A speech provider",
      detail: speech === undefined ? "Checking" : speech.length ? speech.join(", ") : "Not connected",
      check: state(health?.voice),
      action: <Link href={integrations}>Integrations</Link>,
    },
    {
      what: "A phone provider",
      detail:
        health === undefined
          ? "Checking"
          : health.phone.providers.length
            ? health.phone.providers.join(", ")
            : "Twilio or Exotel not connected",
      check: state(health === undefined ? undefined : health.phone.providers.length > 0),
      action: <Link href={integrations}>Integrations</Link>,
    },
    {
      what: "A server the phone provider can reach",
      detail:
        health === undefined
          ? "Checking"
          : health.phone.serverReachable
            ? "Reachable from the internet"
            : "Not reachable from the internet; POST /v1/calls answers 503",
      check: state(health?.phone.serverReachable),
      action: (
        <Link href={routes.docs("placing-calls")}>
          Docs <ExportOutlined aria-hidden />
        </Link>
      ),
    },
    {
      what: "An API key",
      detail: workingKeys === undefined ? "Checking" : workingKeys ? `${workingKeys} working` : "None yet",
      check: state(workingKeys === undefined ? undefined : workingKeys > 0),
      action: (
        <button type="button" onClick={() => onSection("keys")}>
          API keys <ArrowRightOutlined aria-hidden />
        </button>
      ),
    },
    {
      what: "A webhook",
      detail: liveHooks === undefined ? "Checking" : liveHooks ? `${liveHooks} enabled` : "None yet",
      check: state(liveHooks === undefined ? undefined : liveHooks > 0),
      action: (
        <button type="button" onClick={() => onSection("webhooks")}>
          Webhooks <ArrowRightOutlined aria-hidden />
        </button>
      ),
    },
  ];
  const done = checks.filter((c) => c.check === "done").length;
  const detail = DETAILS[step] ?? DETAILS[0]!;

  return (
    <div>
      <ViewHeader
        title="Get started"
        actions={
          <Link href={routes.docs()} className="docs-link">
            Full documentation
          </Link>
        }
      >
        Place a phone call from your own software and have the result sent back when it ends.
      </ViewHeader>
      <Stack>
        <Box data-tour="api-checklist" aria-label="Before your first call">
          <BoxHead>
            <h3>Before your first call</h3>
            <span className="meta" />
            <Progress aria-label={`${done} of ${checks.length} ready`}>
              <i aria-hidden style={{ ["--done" as string]: `${(done / checks.length) * 100}%` }} />
              <span className="meta" aria-hidden>
                {done} of {checks.length} ready
              </span>
            </Progress>
          </BoxHead>
          <Checklist>
            {checks.map((item) => (
              <li key={item.what}>
                <Mark $check={item.check} aria-hidden>
                  {item.check === "done" ? <CheckOutlined /> : <MinusOutlined />}
                </Mark>
                <span>
                  <span className="what">{item.what}</span>
                  <span className="detail">
                    {item.check === "todo" && <span className="sr">Missing: </span>}
                    {item.detail}
                  </span>
                </span>
                {item.action}
              </li>
            ))}
          </Checklist>
        </Box>

        <Box data-tour="api-flow" aria-label="How a call goes">
          <BoxHead>
            <h3>How a call goes</h3>
            <span className="meta">Choose a step to see its code</span>
          </BoxHead>
          <Steps>
            {START_STEPS.map((item, i) => (
              <StepItem key={item.title}>
                <Step
                  type="button"
                  $on={i === step}
                  aria-pressed={i === step}
                  onClick={() => onStep(i)}
                >
                  <span className="n">0{i + 1}</span>
                  <span className="title">{item.title}</span>
                  <span className="summary">{item.summary}</span>
                </Step>
              </StepItem>
            ))}
          </Steps>
          <Detail>
            <p>{detail.text}</p>
            <div className="links">
              {detail.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label} in the docs <ExportOutlined aria-hidden />
                </Link>
              ))}
            </div>
          </Detail>
        </Box>
      </Stack>
    </div>
  );
}
