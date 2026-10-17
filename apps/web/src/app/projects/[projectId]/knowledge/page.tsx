"use client";

import { BookOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Skeleton } from "antd";
import { useParams } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { LoadError } from "@/components/app/agents/states";
import { Empty, Page, PageHeader, Panel, PanelTitle } from "@/components/app/kit";
import { AddSourceModal } from "@/components/app/knowledge/AddSourceModal";
import { RoleTip } from "@/components/app/knowledge/RoleTip";
import { SourceList } from "@/components/app/knowledge/SourceList";
import { TryQuestion } from "@/components/app/knowledge/TryQuestion";
import { atLeast, useKnowledge, useProject } from "@/lib/api";

// The project's knowledge base: what agents may answer side questions from.

const MAX_SOURCES = 50;

// Sources on the left, the question box beside them on wide screens.
const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  align-items: start;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 1fr) 400px;
  }
`;

const Sources = styled(Panel)`
  overflow: hidden;

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(2)};
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  header h2 {
    margin: 0;
  }
  header span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export default function KnowledgePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const knowledge = useKnowledge(projectId);
  const [adding, setAdding] = useState(false);

  const canEdit = atLeast(project.data?.role, "editor");
  const sources = knowledge.data;
  const full = (sources?.length ?? 0) >= MAX_SOURCES;

  const addButton = (
    <RoleTip
      allowed={canEdit && !full}
      title={
        !canEdit
          ? "Editors and above can add sources"
          : `A project can hold ${MAX_SOURCES} sources. Delete one to add another.`
      }
    >
      <Button
        type="primary"
        icon={<PlusOutlined />}
        disabled={!canEdit || full || !sources}
        onClick={() => setAdding(true)}
      >
        Add source
      </Button>
    </RoleTip>
  );

  return (
    <Page>
      <PageHeader
        title="Knowledge"
        description="Facts your agents can use to answer questions that fall outside the flow, before carrying on with the call."
        actions={sources && sources.length > 0 ? addButton : undefined}
      />
      {sources ? (
        sources.length === 0 ? (
          <Empty
            icon={<BookOutlined />}
            title="No sources yet"
            description="Paste text or add a web page, such as an FAQ or price list. Without sources, agents say they don't know when asked something off the flow."
            action={addButton}
          />
        ) : (
          <Layout>
            <Sources $padded={false} aria-labelledby="knowledge-sources">
              <header>
                <PanelTitle id="knowledge-sources">Sources</PanelTitle>
                <span>
                  {sources.length} of {MAX_SOURCES}
                </span>
              </header>
              <SourceList projectId={projectId} sources={sources} canEdit={canEdit} />
            </Sources>
            <TryQuestion projectId={projectId} />
          </Layout>
        )
      ) : knowledge.error ? (
        <LoadError
          title={
            knowledge.error.status === 403
              ? "You cannot see this project's knowledge base"
              : "The knowledge base could not be loaded"
          }
          error={knowledge.error}
          onRetry={() => void knowledge.mutate()}
        />
      ) : (
        <Layout aria-busy aria-label="Loading knowledge base">
          <Panel>
            <Skeleton active title={false} paragraph={{ rows: 6 }} />
          </Panel>
          <Panel>
            <Skeleton active title={false} paragraph={{ rows: 3 }} />
          </Panel>
        </Layout>
      )}
      <AddSourceModal projectId={projectId} open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
