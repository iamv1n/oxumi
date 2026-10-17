"use client";

import {
  ApartmentOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  ExperimentOutlined,
  LeftOutlined,
  MoreOutlined,
  PhoneOutlined,
  SettingOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { App, Button, Dropdown, Input, Popover, Skeleton, Tooltip } from "antd";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { modelLabel, Page, ReadyTag } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import {
  type AgentDetail,
  createAgent,
  deleteAgent,
  updateAgent,
  useAgent,
} from "@/lib/api";
import { routes } from "@/lib/routes";

// Fills the main region: one compact bar (who the agent is, its tabs, its
// actions), then the active tab in a scrolling, unpadded container. The flow
// builder and the test console are full-bleed; the other tabs wrap themselves
// in `Page`.

const BAR_HEIGHT = "52px";
// Widths of the bar itself (not the viewport), so it adapts when a sidebar
// takes or gives back room.
const WIDE = "1100px";
const NARROW = "760px";

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const Header = styled.header`
  flex: none;
  container: agent-bar / inline-size;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`;

const Bar = styled.div`
  display: grid;
  /* Identity takes what it needs, the tabs follow it, actions keep right. */
  grid-template-columns: fit-content(46%) auto minmax(max-content, 1fr);
  grid-template-areas: "identity tabs actions";
  align-items: stretch;
  column-gap: ${({ theme }) => theme.space(5)};
  min-height: ${BAR_HEIGHT};
  padding-inline: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};

  /* Mid widths: tabs sit next to the actions and everything tightens. */
  @container agent-bar (max-width: ${WIDE}) {
    grid-template-columns: minmax(0, 1fr) auto auto;
    column-gap: ${({ theme }) => theme.space(2)};

    .wide-only {
      display: none;
    }
  }
  @container agent-bar (max-width: ${NARROW}) {
    .hide-narrow {
      display: none;
    }
  }
  /* Narrow: the tabs become a scrolling strip under the name row. */
  @container agent-bar (max-width: ${NARROW}) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "identity actions"
      "tabs tabs";
    padding-inline: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  }
`;

const Identity = styled.div`
  grid-area: identity;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
  min-height: ${BAR_HEIGHT};

  .ant-tag {
    flex: none;
    margin: 0;
  }
  .sep {
    flex: none;
    color: ${({ theme }) => theme.color.fgFaint};
  }
  > h1 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("label")}
  height: 28px;
  padding-inline: ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};
  transition:
    color ${({ theme }) => theme.motion.fast},
    background ${({ theme }) => theme.motion.fast};

  .anticon {
    font-size: 11px;
  }
  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const NameButton = styled.button`
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 72px;
  height: 28px;
  margin-inline: -${({ theme }) => theme.space(1)};
  padding-inline: ${({ theme }) => theme.space(2)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: none;
  color: ${({ theme }) => theme.color.fg};
  cursor: text;

  h1 {
    ${type("label")}
    font-size: ${({ theme }) => theme.text.body.size};
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .anticon {
    flex: none;
    width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 12px;
    opacity: 0;
    transition: opacity ${({ theme }) => theme.motion.fast};
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.hover};
  }
  &:hover .anticon,
  &:focus-visible .anticon {
    width: auto;
    opacity: 1;
  }
`;

const NameInput = styled(Input)`
  flex: 0 1 260px;
  min-width: 120px;
  height: 28px;
  font-weight: 600;
`;

const ModelChip = styled.span`
  ${type("caption")}
  flex: none;
  max-width: 180px;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.fgMuted};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const IssueButton = styled.button<{ $tone: "error" | "warning" }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("caption")}
  font-weight: 500;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) =>
    $tone === "error" ? theme.color.dangerSoft : theme.color.warningSoft};
  color: ${({ theme, $tone }) => ($tone === "error" ? theme.color.danger : theme.color.warning)};
  cursor: pointer;
  white-space: nowrap;
`;

const IssueList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  max-width: 360px;
  max-height: 320px;
  overflow: auto;

  li {
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fg};
  }
  .anticon {
    margin-top: 3px;
  }
  .error {
    color: ${({ theme }) => theme.color.danger};
  }
  .warning {
    color: ${({ theme }) => theme.color.warning};
  }
`;

const Tabs = styled.nav`
  grid-area: tabs;
  position: relative;
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => theme.space(1)};
  min-width: 0;
  padding-left: ${({ theme }) => theme.space(3)};

  /* A hairline separates who the agent is from where you are in it. */
  &::before {
    content: "";
    position: absolute;
    top: ${({ theme }) => theme.space(4)};
    bottom: ${({ theme }) => theme.space(4)};
    left: 0;
    width: 1px;
    background: ${({ theme }) => theme.color.line};
  }

  @container agent-bar (max-width: ${WIDE}) {
    gap: 0;
    padding-right: ${({ theme }) => theme.space(2)};
  }
  @container agent-bar (max-width: ${NARROW}) {
    height: 40px;
    margin-inline: -${({ theme }) => theme.space(1)};
    padding-inline: 0;

    &::before {
      display: none;
    }
    overflow-x: auto;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    scrollbar-width: none;
  }
`;

const Tab = styled(Link)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("label")}
  padding-inline: ${({ theme }) => theme.space(3)};
  color: ${({ theme, $active }) => ($active ? theme.color.fg : theme.color.fgMuted)};
  transition: color ${({ theme }) => theme.motion.fast};

  .anticon {
    color: ${({ theme, $active }) => ($active ? theme.color.accentText : theme.color.fgSubtle)};
    transition: color ${({ theme }) => theme.motion.fast};
  }
  /* The hover wash is inset so the tab still reads as part of the bar. */
  &::before {
    content: "";
    position: absolute;
    inset: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(0.5)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: transparent;
    transition: background ${({ theme }) => theme.motion.fast};
  }
  &::after {
    content: "";
    position: absolute;
    right: ${({ theme }) => theme.space(3)};
    bottom: -1px;
    left: ${({ theme }) => theme.space(3)};
    height: 2px;
    border-radius: ${({ theme }) => theme.radius.pill} ${({ theme }) => theme.radius.pill} 0 0;
    background: ${({ theme, $active }) => ($active ? theme.color.accentLine : "transparent")};
  }
  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  &:hover::before {
    background: ${({ theme, $active }) => ($active ? "transparent" : theme.color.hover)};
  }
  &:focus-visible {
    box-shadow: none;
  }
  &:focus-visible::before {
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }
  > * {
    position: relative;
  }

  @container agent-bar (max-width: ${WIDE}) {
    padding-inline: ${({ theme }) => theme.space(2.5)};

    .anticon {
      display: none;
    }
    &::after {
      right: ${({ theme }) => theme.space(2.5)};
      left: ${({ theme }) => theme.space(2.5)};
    }
  }
  @container agent-bar (max-width: ${NARROW}) {
    padding-inline: ${({ theme }) => theme.space(3)};

    .anticon {
      display: inline-flex;
    }
    &::after {
      bottom: 0;
    }
  }
`;

const Actions = styled.div`
  grid-area: actions;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(1)};
  min-height: ${BAR_HEIGHT};

  .compact-only {
    display: none;
  }
  @container agent-bar (max-width: ${WIDE}) {
    .compact-only {
      display: inline-flex;
    }
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

type TabKey = "flow" | "config" | "data" | "test" | "calls";

function activeTab(pathname: string, base: string): TabKey {
  const rest = pathname.slice(base.length).split("/")[1];
  return rest === "config" || rest === "data" || rest === "test" || rest === "calls"
    ? rest
    : "flow";
}

function AgentName({
  agent,
  editing,
  onEditing,
}: {
  agent: AgentDetail;
  editing: boolean;
  onEditing: (editing: boolean) => void;
}) {
  const { message } = App.useApp();
  const [draft, setDraft] = useState(agent.name);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    if (saving) return;
    const name = draft.trim();
    if (!name || name === agent.name) return onEditing(false);
    setSaving(true);
    try {
      await updateAgent(agent.id, { name });
      onEditing(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not rename the agent.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <NameInput
        autoFocus
        size="small"
        value={draft}
        maxLength={80}
        disabled={saving}
        aria-label="Agent name"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onPressEnter={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onEditing(false);
        }}
      />
    );
  }
  return (
    <Tooltip title="Rename" placement="bottom" mouseEnterDelay={0.6}>
      <NameButton
        type="button"
        aria-label={`Rename agent ${agent.name}`}
        onClick={() => {
          setDraft(agent.name);
          onEditing(true);
        }}
      >
        <h1>{agent.name}</h1>
        <EditOutlined />
      </NameButton>
    </Tooltip>
  );
}

function Issues({ agent }: { agent: AgentDetail }) {
  if (agent.issues.length === 0) return null;
  const errors = agent.issues.filter((i) => i.level === "error").length;
  const warnings = agent.issues.length - errors;
  const tone = errors > 0 ? "error" : "warning";
  const count = errors > 0 ? errors : warnings;
  const noun = errors > 0 ? "issue" : "warning";
  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title={agent.ready ? "Warnings" : "Fix these before this agent can take calls"}
      content={
        <IssueList>
          {agent.issues.map((issue, i) => (
            <li key={i}>
              {issue.level === "error" ? (
                <ExclamationCircleFilled className="error" />
              ) : (
                <WarningFilled className="warning" />
              )}
              <span>{issue.message}</span>
            </li>
          ))}
        </IssueList>
      }
    >
      <IssueButton type="button" $tone={tone}>
        {tone === "error" ? <ExclamationCircleFilled /> : <WarningFilled />}
        {count} {count === 1 ? noun : `${noun}s`}
      </IssueButton>
    </Popover>
  );
}

function AgentMenu({ agent, onRename }: { agent: AgentDetail; onRename: () => void }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [busy, setBusy] = useState(false);

  const duplicate = async () => {
    setBusy(true);
    try {
      const copy = await createAgent(agent.projectId, {
        name: `${agent.name} copy`.slice(0, 80),
        description: agent.description || undefined,
      });
      await updateAgent(copy.id, { flow: agent.flow, layout: agent.layout, model: agent.model });
      message.success(`Created "${copy.name}"`);
      router.push(routes.agent(agent.projectId, copy.id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not duplicate the agent.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    modal.confirm({
      title: `Delete "${agent.name}"?`,
      content:
        "The agent, its flow and its entire call history will be removed. This cannot be undone.",
      okText: "Delete agent",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        try {
          await deleteAgent(agent);
          message.success(`Deleted "${agent.name}"`);
          router.push(routes.agents(agent.projectId));
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not delete the agent.");
        }
      },
    });
  };

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          { key: "rename", icon: <EditOutlined />, label: "Rename", onClick: onRename },
          { key: "duplicate", icon: <CopyOutlined />, label: "Duplicate", onClick: duplicate },
          { type: "divider" },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: "Delete agent",
            onClick: remove,
          },
        ],
      }}
    >
      <Button type="text" icon={<MoreOutlined />} loading={busy} aria-label="Agent actions" />
    </Dropdown>
  );
}

export default function AgentLayout({ children }: { children: ReactNode }) {
  const { projectId, agentId } = useParams<{ projectId: string; agentId: string }>();
  const pathname = usePathname();
  const agent = useAgent(agentId);
  const [renaming, setRenaming] = useState(false);
  const active = activeTab(pathname, routes.agent(projectId, agentId));

  const tabs: { key: TabKey; label: string; href: string; icon: ReactNode }[] = [
    { key: "flow", label: "Flow", href: routes.agent(projectId, agentId), icon: <ApartmentOutlined /> },
    { key: "config", label: "Configuration", href: routes.agentConfig(projectId, agentId), icon: <SettingOutlined /> },
    { key: "data", label: "Data", href: routes.agentData(projectId, agentId), icon: <DatabaseOutlined /> },
    { key: "test", label: "Test", href: routes.agentTest(projectId, agentId), icon: <ExperimentOutlined /> },
    { key: "calls", label: "Calls", href: routes.agentCalls(projectId, agentId), icon: <PhoneOutlined /> },
  ];

  const missing = agent.error && !agent.data;
  const notFound = agent.error?.status === 404;
  const testHref = routes.agentTest(projectId, agentId);

  return (
    <Shell>
      <Header>
        <Bar>
          <Identity>
            <Tooltip title="All agents" placement="bottom" mouseEnterDelay={0.6}>
              <BackLink href={routes.agents(projectId)} aria-label="Back to all agents">
                <LeftOutlined />
                <span className="wide-only">Agents</span>
              </BackLink>
            </Tooltip>
            <span className="sep wide-only" aria-hidden>
              /
            </span>
            {agent.data ? (
              <>
                <AgentName agent={agent.data} editing={renaming} onEditing={setRenaming} />
                <span data-tour="agent-status" style={{ display: "contents" }}>
                  {/* When not ready, the issue count says so in less room. */}
                  <span className={agent.data.ready ? undefined : "hide-narrow"}>
                    <ReadyTag ready={agent.data.ready} />
                  </span>
                  <Issues agent={agent.data} />
                </span>
                <Tooltip title="The AI model that runs this agent's calls. Change it under Configuration.">
                  <ModelChip className="wide-only">{modelLabel(agent.data.model)}</ModelChip>
                </Tooltip>
              </>
            ) : missing ? (
              <h1>{notFound ? "Agent not found" : "Agent unavailable"}</h1>
            ) : (
              <Skeleton.Input active size="small" style={{ width: 200 }} />
            )}
          </Identity>

          <Tabs aria-label="Agent sections" data-tour="agent-tabs">
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                href={tab.href}
                $active={tab.key === active}
                aria-current={tab.key === active ? "page" : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Tab>
            ))}
          </Tabs>

          <Actions>
            {agent.data && (
              <>
                {/* The flow builder and the test console carry their own call button. */}
                {active !== "test" && active !== "flow" && (
                  <>
                    <Link href={testHref} className="wide-only" tabIndex={-1} data-tour="agent-test-call">
                      <Button type="primary" icon={<ExperimentOutlined />}>
                        Test call
                      </Button>
                    </Link>
                    <Tooltip title="Test call" placement="bottom">
                      <Link href={testHref} className="compact-only" tabIndex={-1}>
                        <Button type="primary" icon={<ExperimentOutlined />} aria-label="Test call" />
                      </Link>
                    </Tooltip>
                  </>
                )}
                <AgentMenu agent={agent.data} onRename={() => setRenaming(true)} />
              </>
            )}
          </Actions>
        </Bar>
      </Header>
      <Body>
        {missing ? (
          <Page>
            <LoadError
              title={notFound ? "This agent does not exist" : "The agent could not be loaded"}
              error={
                notFound
                  ? { message: "It may have been deleted. Go back to the list to pick another." }
                  : agent.error
              }
              onRetry={notFound ? undefined : () => agent.mutate()}
              action={
                <Link href={routes.agents(projectId)}>
                  <Button>Back to agents</Button>
                </Link>
              }
            />
          </Page>
        ) : (
          children
        )}
      </Body>
    </Shell>
  );
}
