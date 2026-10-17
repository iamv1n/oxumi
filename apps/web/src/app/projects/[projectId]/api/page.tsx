"use client";

import { CodeOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import { useParams } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styled from "styled-components";
import { CodePanel } from "@/components/app/api/CodePanel";
import {
  type CodeView,
  keysView,
  logsView,
  startView,
  usageView,
  webhooksView,
} from "@/components/app/api/codeViews";
import { GetStarted } from "@/components/app/api/GetStarted";
import { KeysPanel } from "@/components/app/api/KeysPanel";
import { LogsPanel, type RouteSelection } from "@/components/app/api/LogsPanel";
import { ApiSummary } from "@/components/app/api/Summary";
import { UsagePanel } from "@/components/app/api/UsagePanel";
import { WebhooksPanel } from "@/components/app/api/WebhooksPanel";
import { useMediaQuery } from "@/components/app/shell/useStoredFlag";
import { DOCS_CONTEXT, type ExampleContext } from "@oxumi/ui/docs/examples";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import {
  useAgent,
  useAgents,
  useApiKeys,
  useApiUsage,
  useHealth,
  useWebhookDeliveries,
  useWebhooks,
  type WebhookDelivery,
} from "@/lib/api";

const GUIDE: Guide = {
  id: "project-api",
  steps: [
    {
      title: "Put agents inside your own product",
      description:
        "With the API, your software asks for a phone call, the agent makes it, and the result is sent back to you when the call ends. Nobody needs to open this console.",
    },
    {
      target: '[data-tour="api-summary"]',
      title: "The API at a glance",
      description:
        "How many keys and webhooks are switched on, and how the last week went. It stays here whichever part you are looking at.",
    },
    {
      target: '[data-tour="api-tabs"]',
      title: "Five parts",
      description:
        "Get started walks through the first call. API keys identify your software. Webhooks are where results are sent. Logs show what went out and came in. Usage shows how much the API is being used.",
      placement: "bottomLeft",
    },
    {
      target: '[data-tour="api-code"]',
      title: "The code follows you",
      description:
        "This panel always shows the code for what you are looking at, with this project's own values filled in. Choose your language once; select a key, a step or a log row and the code changes to match.",
      placement: "left",
    },
    {
      target: '[data-tour="api-flow"]',
      title: "The three steps of a call",
      description:
        "Place a call, let it run, receive the result. Choose a step to read what happens and see its request and response.",
    },
    {
      target: '[data-tour="api-create-key"]',
      title: "Create a key",
      description:
        "Make one key for each system that connects. The key is shown only once, right after you create it, so copy it straight away.",
      placement: "bottomRight",
    },
    {
      target: '[data-tour="api-keys-table"]',
      title: "Rotate or revoke",
      description:
        "Rotate swaps a key for a new one and can keep the old one working for a while, so nothing breaks. Revoke switches a key off immediately.",
    },
    {
      target: '[data-tour="api-tab-webhooks"]',
      title: "Then add a webhook",
      description:
        "Give us a URL in your system. When a call ends we post the outcome, the answers and the transcript there, and retry for several hours if it is down.",
      placement: "bottom",
    },
  ],
};

type SectionKey = "start" | "keys" | "webhooks" | "logs" | "usage";
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "start", label: "Get started" },
  { key: "keys", label: "API keys" },
  { key: "webhooks", label: "Webhooks" },
  { key: "logs", label: "Logs" },
  { key: "usage", label: "Usage" },
];
const isSection = (value: string): value is SectionKey =>
  SECTIONS.some((section) => section.key === value);

// From this width the code panel sits beside the work; below it, it is a
// sheet opened with the Code button (or, on phones, stacked underneath).
const SPLIT = "(min-width: 1100px)";
const PHONE = "(max-width: 639px)";

// A developer console in two halves: the work on the left, and on the right
// the code for whatever is being looked at.
const Console = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100%;

  @media ${SPLIT} {
    grid-template-columns: minmax(0, 1fr) clamp(380px, 36%, 480px);
  }
`;

const Work = styled.div`
  min-width: 0;
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(20)};

  ${({ theme }) => theme.media.sm} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const Title = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  h1 {
    ${type("title")}
    color: ${({ theme }) => theme.color.fg};
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
  p {
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
`;

const Side = styled.div`
  display: none;

  @media ${SPLIT} {
    position: sticky;
    top: 0;
    display: block;
    height: calc(100vh - ${({ theme }) => theme.layout.topbar});
    border-left: 1px solid ${({ theme }) => theme.color.line};
    overflow-y: auto;
  }
`;

const Stacked = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const CodeButton = styled.div`
  position: fixed;
  right: ${({ theme }) => theme.space(5)};
  bottom: ${({ theme }) => theme.space(5)};
  z-index: 30;
  border-radius: ${({ theme }) => theme.radius.control};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

// The section switcher: a numbered strip, pinned while the section scrolls.
const Nav = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  margin: ${({ theme }) => theme.space(3)} 0 ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow-x: auto;
  scrollbar-width: none;
`;

const NavItem = styled.button<{ $active: boolean }>`
  ${type("label")}
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  flex: 1 0 auto;
  justify-content: center;
  height: ${({ theme }) => theme.space(9)};
  padding: 0 ${({ theme }) => theme.space(3)};
  border: 0;
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme, $active }) => ($active ? theme.color.hover : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.fg : theme.color.fgMuted)};
  cursor: pointer;
  white-space: nowrap;

  &:last-child {
    border-right: 0;
  }
  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    background: ${({ theme, $active }) => ($active ? theme.color.accentLine : "transparent")};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }

  .n {
    ${type("code")}
    color: ${({ theme, $active }) => ($active ? theme.color.accentText : theme.color.fgSubtle)};
    font-size: ${({ theme }) => theme.text.caption.size};
  }
  .count {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
  }
  .alert {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.danger};
  }
  .alert::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: currentColor;
  }
`;

export default function ProjectApiPage() {
  const { projectId } = useParams<{ projectId: string }>();
  usePageGuide(GUIDE);

  const [section, setSection] = useState<SectionKey>("start");
  // What is selected in each section; together they decide the code shown.
  const [step, setStep] = useState(0);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteSelection | null>(null);
  const [logsPick, setLogsPick] = useState<"delivery" | "route">("delivery");
  const [sheet, setSheet] = useState(false);
  const navRefs = useRef<Partial<Record<SectionKey, HTMLButtonElement | null>>>({});

  const split = useMediaQuery(SPLIT);
  const phone = useMediaQuery(PHONE);
  // False on the server and for the first paint, when the width is unknown.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const keys = useApiKeys(projectId);
  const webhooks = useWebhooks(projectId);
  const deliveries = useWebhookDeliveries(projectId);
  const week = useApiUsage(projectId, 7);
  const agents = useAgents(projectId);
  const health = useHealth(projectId);
  // The samples use one of this project's own agents, preferably a ready one.
  const exampleAgent = agents.data?.find((agent) => agent.ready) ?? agents.data?.[0];
  const agentDetail = useAgent(exampleAgent?.id);

  // A link such as /api#webhooks opens that section.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only known in the browser
    if (isSection(fromHash)) setSection(fromHash);
  }, []);

  const select = (next: SectionKey) => {
    setSection(next);
    window.history.replaceState(null, "", next === "start" ? window.location.pathname : `#${next}`);
  };

  const onNavKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SECTIONS.findIndex((item) => item.key === section);
    const move: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: SECTIONS.length - 1,
    };
    const target = move[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = SECTIONS[(target + SECTIONS.length) % SECTIONS.length]!.key;
    select(next);
    navRefs.current[next]?.focus();
  };

  const working = keys.data?.filter((k) => k.status === "active" || k.status === "expiring");
  // Deliveries that have not arrived, on endpoints that still exist.
  const liveEndpoints = new Set((webhooks.data ?? []).map((w) => w.id));
  const failing = (deliveries.data ?? []).filter(
    (d) => d.status !== "delivered" && liveEndpoints.has(d.endpointId),
  ).length;
  const counts: Partial<Record<SectionKey, number | undefined>> = {
    keys: working?.length,
    webhooks: webhooks.data?.length,
    logs: deliveries.data?.length,
  };

  // The key the samples are written for: the chosen one, else a working one.
  const selectedKey =
    keys.data?.find((key) => key.id === keyId) ?? working?.[0] ?? keys.data?.[0];
  const newestDelivery = (deliveries.data ?? []).reduce<WebhookDelivery | undefined>(
    (best, d) => (!best || +new Date(d.createdAt) > +new Date(best.createdAt) ? d : best),
    undefined,
  );
  // In Logs something is always selected, so the code panel is never empty.
  const logDeliveryId =
    deliveryId ?? (section === "logs" && logsPick === "delivery" ? (newestDelivery?.id ?? null) : null);
  const selectedDelivery = deliveries.data?.find((d) => d.id === logDeliveryId);
  const deliveryUrl = selectedDelivery
    ? webhooks.data?.find((w) => w.id === selectedDelivery.endpointId)?.url
    : undefined;

  const declared = agentDetail.data?.flow.variables;
  const context = useMemo<ExampleContext>(() => {
    if (!exampleAgent) return DOCS_CONTEXT;
    const variables = Object.fromEntries(
      (declared ?? []).map((variable) => [variable.name, variable.example ?? ""]),
    );
    return {
      ...DOCS_CONTEXT,
      agentId: exampleAgent.id,
      agentName: exampleAgent.name,
      variables: Object.keys(variables).length ? variables : DOCS_CONTEXT.variables,
    };
  }, [exampleAgent, declared]);

  const view = useMemo<CodeView>(() => {
    const keyHint = selectedKey?.prefix;
    if (section === "start") return startView(step, context, keyHint);
    if (section === "keys") return keysView(selectedKey);
    if (section === "webhooks") return webhooksView(context, selectedDelivery, deliveryUrl);
    if (section === "usage") return usageView();
    return logsView(
      context,
      logsPick === "delivery" && selectedDelivery
        ? { kind: "delivery", delivery: selectedDelivery, url: deliveryUrl }
        : route
          ? { kind: "route", ...route }
          : null,
      keyHint,
    );
  }, [section, step, context, selectedKey, selectedDelivery, deliveryUrl, logsPick, route]);

  const pickDelivery = (id: string) => {
    setDeliveryId(id);
    setLogsPick("delivery");
  };
  const panel = <CodePanel view={view} />;

  return (
    <Console>
      <Work>
        <Title>
          <h1>API</h1>
          <p>Place calls from your own software and get the results sent back when they end.</p>
        </Title>
        <ApiSummary
          keys={keys.data}
          webhooks={webhooks.data}
          deliveries={deliveries.data}
          week={week.data}
        />
        <Nav role="tablist" aria-label="API sections" data-tour="api-tabs" onKeyDown={onNavKeyDown}>
          {SECTIONS.map((item, index) => (
            <NavItem
              key={item.key}
              ref={(element) => {
                navRefs.current[item.key] = element;
              }}
              type="button"
              role="tab"
              id={`api-tab-${item.key}`}
              aria-selected={section === item.key}
              aria-controls="api-panel"
              tabIndex={section === item.key ? 0 : -1}
              $active={section === item.key}
              data-tour={`api-tab-${item.key}`}
              onClick={() => select(item.key)}
            >
              <span className="n" aria-hidden>
                0{index + 1}
              </span>
              {item.label}
              {counts[item.key] !== undefined && <span className="count">{counts[item.key]}</span>}
              {(item.key === "webhooks" || item.key === "logs") && failing > 0 && (
                <span className="alert">{failing} failing</span>
              )}
            </NavItem>
          ))}
        </Nav>
        <div role="tabpanel" id="api-panel" aria-labelledby={`api-tab-${section}`}>
          {section === "start" && (
            <GetStarted
              projectId={projectId}
              agents={agents.data}
              health={health.data}
              keys={keys.data}
              webhooks={webhooks.data}
              step={step}
              onStep={setStep}
              onSection={select}
            />
          )}
          {section === "keys" && (
            <KeysPanel
              projectId={projectId}
              selectedId={selectedKey?.id ?? null}
              onSelect={setKeyId}
            />
          )}
          {section === "webhooks" && (
            <WebhooksPanel
              projectId={projectId}
              deliveryId={deliveryId}
              onDelivery={pickDelivery}
              onLogs={() => select("logs")}
            />
          )}
          {section === "logs" && (
            <LogsPanel
              projectId={projectId}
              deliveryId={logsPick === "delivery" ? logDeliveryId : null}
              onDelivery={pickDelivery}
              route={logsPick === "route" ? route : null}
              onRoute={(next) => {
                setRoute(next);
                setLogsPick("route");
              }}
            />
          )}
          {section === "usage" && <UsagePanel projectId={projectId} onTab={select} />}
        </div>
      </Work>

      <Side>{panel}</Side>

      {mounted && !split && phone && <Stacked>{panel}</Stacked>}
      {mounted && !split && !phone && (
        <>
          <CodeButton>
            <Button
              type="primary"
              icon={<CodeOutlined />}
              aria-haspopup="dialog"
              aria-expanded={sheet}
              onClick={() => setSheet(true)}
            >
              Code
            </Button>
          </CodeButton>
          <Drawer
            open={sheet}
            onClose={() => setSheet(false)}
            placement="bottom"
            size="70vh"
            title={`Code · ${view.title}`}
            styles={{ body: { padding: 0 } }}
          >
            {panel}
          </Drawer>
        </>
      )}
    </Console>
  );
}
