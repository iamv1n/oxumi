"use client";

import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { Page, PageHeader } from "@/components/app/kit";
import { PROJECTS_GUIDE } from "@/components/onboarding/guides";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { CreateProjectModal } from "@/components/app/projects/CreateProjectModal";
import { plural } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { ProjectList, ProjectListSkeleton } from "@/components/app/projects/ProjectList";
import { Steps } from "@/components/app/projects/Steps";
import { TopBar } from "@/components/app/shell/TopBar";
import { type } from "@oxumi/ui/design/typography";
import { useProjects } from "@/lib/api";

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.color.canvas};
`;

const Sticky = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
`;

// First run: what a project is and the one action to take, with the steps
// that follow underneath. Sized like any other panel, not a hero.
const FirstRun = styled.section`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  .lead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(6)};
    padding: ${({ theme }) => theme.space(4)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  .lead > div {
    flex: 1;
    min-width: min(100%, 320px);
  }
  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  .lead p {
    ${type("label")}
    max-width: 44rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
  .next {
    ${type("overline")}
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)} 0;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export default function ProjectsPage() {
  usePageGuide(PROJECTS_GUIDE);
  const { data: projects, error, isLoading, mutate } = useProjects();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = projects ?? [];
    return q ? all.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q)) : all;
  }, [projects, query]);

  const openCreate = () => setCreating(true);
  const hasProjects = Boolean(projects?.length);

  let body;
  if (!projects && error) {
    body = <LoadError error={error} what="projects" onRetry={() => void mutate()} />;
  } else if (!projects || (isLoading && !projects)) {
    body = <ProjectListSkeleton />;
  } else if (projects.length === 0) {
    body = (
      <FirstRun>
        <div className="lead">
          <div>
            <h2>Create your first project</h2>
            <p>
              A project holds the call agents for one team or use case. Design a conversation
              once, and an AI voice agent makes the call in Hindi or English and returns
              structured answers.
            </p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New project
          </Button>
        </div>
        <p className="next">What happens next</p>
        <Steps
          steps={[
            {
              title: "Create an agent",
              description: "Start from a template or a blank flow inside your project.",
            },
            {
              title: "Design the flow",
              description: "Drag steps onto the canvas: what to say, what to ask, where to branch.",
            },
            {
              title: "Run a test call",
              description: "Talk to the agent in your browser and review the answers it captured.",
            },
          ]}
        />
      </FirstRun>
    );
  } else {
    const searching = Boolean(query.trim());
    body = (
      <ProjectList
        projects={matches}
        toolbar={
          <>
            <Input
              className="search"
              variant="borderless"
              allowClear
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              prefix={<SearchOutlined />}
              placeholder="Search projects"
              aria-label="Search projects"
            />
            <span className="count" role="status">
              {searching
                ? `${matches.length} of ${plural(projects.length, "project")}`
                : plural(projects.length, "project")}
            </span>
          </>
        }
        empty={
          <>
            <span>No project matches &ldquo;{query.trim()}&rdquo;.</span>
            <Button size="small" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Frame>
      <Sticky>
        <TopBar />
      </Sticky>
      <main>
        <Page>
          <PageHeader
            title="Projects"
            description="Each project groups call agents, their flows and call history."
            actions={
              projects && (
                <Button
                  type={hasProjects ? "primary" : "default"}
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                  data-tour="new-project"
                >
                  New project
                </Button>
              )
            }
          />
          {body}
        </Page>
      </main>
      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </Frame>
  );
}
