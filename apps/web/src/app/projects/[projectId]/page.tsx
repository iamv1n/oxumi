"use client";

import { PhoneOutlined, PlusOutlined, RobotOutlined } from "@ant-design/icons";
import { Skeleton } from "antd";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import styled from "styled-components";
import { formatMs, Page, PageHeader, Panel } from "@/components/app/kit";
import { OVERVIEW_GUIDE } from "@/components/onboarding/guides";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { formatDate, plural } from "@/components/app/projects/format";
import { LinkButton } from "@/components/app/projects/LinkButton";
import { LoadError } from "@/components/app/projects/LoadError";
import { OutcomeBreakdown } from "@/components/app/projects/OutcomeBreakdown";
import {
  AgentRows,
  ListPanel,
  PanelEmpty,
  PanelError,
  RecentCalls,
  RowsSkeleton,
} from "@/components/app/projects/OverviewLists";
import { Steps } from "@/components/app/projects/Steps";
import { type } from "@oxumi/ui/design/typography";
import { useAgents, useCalls, useProject, useProjectStats } from "@/lib/api";
import { routes } from "@/lib/routes";

const RECENT = 5;

const Created = styled.span`
  color: ${({ theme }) => theme.color.fgSubtle};
`;

// The sidebar rail already offers this on narrow screens, where the header
// has no room for it beside the title.
const WideOnly = styled.span`
  display: none;

  ${({ theme }) => theme.media.sm} {
    display: inline-flex;
  }
`;

// The headline numbers as one strip: cells divided by hairlines, four across
// on wide screens and two by two below that.
const StatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  > div {
    min-width: 0;
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
    /* Hairlines between cells whatever the column count: each cell draws its
       top and left edge, and the strip clips the outermost ones. */
    margin: -1px 0 0 -1px;
    border-top: 1px solid ${({ theme }) => theme.color.line};
    border-left: 1px solid ${({ theme }) => theme.color.line};
  }
  dt {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(0.5)};
  }
  strong {
    ${type("heading")}
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  small {
    ${type("caption")}
    min-width: 0;
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        <small>{hint}</small>
      </dd>
    </div>
  );
}

const Guide = styled(Panel)`
  margin-bottom: ${({ theme }) => theme.space(3)};
  padding: 0;
  overflow: hidden;

  > header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  h2 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  header p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Columns = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  align-items: start;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  min-width: 0;
`;

const HeaderSkeleton = styled.div`
  margin-bottom: ${({ theme }) => theme.space(5)};
`;

export default function ProjectOverviewPage() {
  usePageGuide(OVERVIEW_GUIDE);
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const stats = useProjectStats(projectId);
  const agents = useAgents(projectId);
  const calls = useCalls(projectId);

  if (project.error && !project.data) {
    const missing = project.error.status === 404;
    return (
      <Page>
        <LoadError
          error={project.error}
          what={
            missing
              ? "It may have been deleted, or it belongs to a different account."
              : "this project"
          }
          title={missing ? "Project not found" : undefined}
          onRetry={missing ? undefined : () => void project.mutate()}
          action={<LinkButton href={routes.projects}>All projects</LinkButton>}
        />
      </Page>
    );
  }

  const s = stats.data;
  const dash = "—";
  const running = s?.outcomes.in_progress ?? 0;
  const finished = s ? s.calls - running : 0;

  const agentList = agents.data ?? [];
  const readyAgents = agentList.filter((agent) => agent.ready);
  // Where the guide sends you: an agent that still needs work, else any agent.
  const draftAgent = agentList.find((agent) => !agent.ready) ?? agentList[0];
  const hasAgents = agentList.length > 0;
  const hasReady = readyAgents.length > 0;
  const showGuide = Boolean(s && agents.data && s.calls === 0);

  const recent = [...(calls.data ?? [])]
    .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
    .slice(0, RECENT);

  return (
    <Page>
      {project.data ? (
        <PageHeader
          title={project.data.name}
          description={
            <>
              {project.data.description || "No description yet."}{" "}
              <Created>· Created {formatDate(project.data.createdAt)}</Created>
            </>
          }
          actions={
            <WideOnly>
              <LinkButton href={routes.agents(projectId)} $variant="primary">
                <RobotOutlined aria-hidden />
                View agents
              </LinkButton>
            </WideOnly>
          }
        />
      ) : (
        <HeaderSkeleton aria-busy aria-label="Loading project">
          <Skeleton active title={{ width: 200 }} paragraph={false} />
        </HeaderSkeleton>
      )}

      {stats.error && !s ? (
        <StatRow as="div" style={{ display: "block" }}>
          <LoadError
            compact
            error={stats.error}
            what="project statistics"
            onRetry={() => void stats.mutate()}
          />
        </StatRow>
      ) : (
        <StatRow as="dl" aria-busy={!s} data-tour="overview-stats">
          {s ? (
            <>
              <Metric
                label="Agents"
                value={s.agents.toLocaleString()}
                hint={
                  s.agents === 0
                    ? "None created yet"
                    : agents.data
                      ? `${readyAgents.length} of ${agentList.length} ready for calls`
                      : " "
                }
              />
              <Metric
                label="Calls"
                value={s.calls.toLocaleString()}
                hint={
                  s.calls === 0
                    ? "No calls yet"
                    : running > 0
                      ? `${running} in progress`
                      : `${plural(finished, "call")} finished`
                }
              />
              <Metric
                label="Completed rate"
                value={finished > 0 ? `${Math.round((s.completed / finished) * 100)}%` : dash}
                hint={
                  finished > 0
                    ? `${s.completed.toLocaleString()} of ${plural(finished, "finished call")}`
                    : "No finished calls yet"
                }
              />
              <Metric
                label="Median first audio"
                value={formatMs(s.medianFirstAudioMs)}
                hint={
                  s.medianFirstAudioMs === null
                    ? "no voice calls yet"
                    : "after the caller stops"
                }
              />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden>
                <Skeleton active title={{ width: 72 }} paragraph={{ rows: 1, width: 120 }} />
              </div>
            ))
          )}
        </StatRow>
      )}

      {showGuide && (
        <Guide aria-labelledby="guide-title">
          <header>
            <h2 id="guide-title">Get to your first call</h2>
            <p>Three steps from an empty project to a finished call with structured answers.</p>
          </header>
          <Steps
            steps={[
              {
                title: "Create an agent",
                description: "An agent is one kind of call. Start from a template or a blank flow.",
                done: hasAgents,
                current: !hasAgents,
                action: !hasAgents && (
                  <LinkButton href={routes.agents(projectId)} $variant="primary" $small>
                    <PlusOutlined aria-hidden />
                    Create an agent
                  </LinkButton>
                ),
              },
              {
                title: "Design the flow",
                description:
                  "Lay out what the agent says, what it asks and where the conversation branches.",
                done: hasReady,
                current: hasAgents && !hasReady,
                action: hasAgents && !hasReady && draftAgent && (
                  <LinkButton href={routes.agent(projectId, draftAgent.id)} $variant="primary" $small>
                    Open the flow builder
                  </LinkButton>
                ),
              },
              {
                title: "Run a test call",
                description:
                  "Talk to the agent in your browser, by voice or text, and review what it captured.",
                current: hasReady,
                action: hasReady && readyAgents[0] && (
                  <LinkButton
                    href={routes.agentTest(projectId, readyAgents[0].id)}
                    $variant="primary"
                    $small
                  >
                    Start a test call
                  </LinkButton>
                ),
              },
            ]}
          />
        </Guide>
      )}

      <Columns>
        <Stack>
          <ListPanel
            title="Recent calls"
            href={calls.data?.length ? routes.calls(projectId) : undefined}
          >
            {calls.error && !calls.data ? (
              <PanelError message={calls.error.message} />
            ) : !calls.data ? (
              <RowsSkeleton />
            ) : recent.length === 0 ? (
              <PanelEmpty
                icon={<PhoneOutlined />}
                title="No calls yet"
                description="Calls show up here as soon as an agent makes one, starting with your test calls."
              />
            ) : (
              <RecentCalls projectId={projectId} calls={recent} />
            )}
          </ListPanel>

          <ListPanel
            title="Agents"
            count={agents.data?.length}
            href={routes.agents(projectId)}
            linkLabel={agents.data?.length ? "View all" : "Go to agents"}
          >
            {agents.error && !agents.data ? (
              <PanelError message={agents.error.message} />
            ) : !agents.data ? (
              <RowsSkeleton rows={2} />
            ) : agentList.length === 0 ? (
              <PanelEmpty
                icon={<RobotOutlined />}
                title="No agents yet"
                description="Create an agent to design its call flow and start testing."
                action={
                  <LinkButton href={routes.agents(projectId)} $small>
                    <PlusOutlined aria-hidden />
                    Create an agent
                  </LinkButton>
                }
              />
            ) : (
              <AgentRows projectId={projectId} agents={agentList} />
            )}
          </ListPanel>
        </Stack>

        <ListPanel title="Outcomes" padded>
          {stats.error && !s ? (
            <PanelError message={stats.error.message} />
          ) : !s ? (
            <Skeleton active title={false} paragraph={{ rows: 5 }} />
          ) : (
            <OutcomeBreakdown outcomes={s.outcomes} />
          )}
        </ListPanel>
      </Columns>
    </Page>
  );
}
