"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Space } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Panel, PanelTitle } from "@/components/app/kit";
import { ApiError, type KnowledgeHit, searchKnowledge } from "@/lib/api";

// Asks the knowledge base a question the way a caller would, and shows the
// passages an agent would be handed for it.

const Box = styled(Panel)`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  > h2 {
    margin: 0;
  }
  .intro {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Hits = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};

  li {
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
  }
  .from {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
    overflow-wrap: anywhere;
  }
  .content {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fg};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

const Nothing = styled.p`
  ${type("caption")}
  padding: ${({ theme }) => theme.space(3)};
  border: 1px dashed ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};
`;

export function TryQuestion({ projectId }: { projectId: string }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const search = async () => {
    const text = question.trim();
    if (!text) return;
    setSearching(true);
    setFailure(null);
    try {
      setHits(await searchKnowledge(projectId, text));
      setAsked(text);
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not search the knowledge base.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box aria-labelledby="try-question">
      <PanelTitle id="try-question">Try a question</PanelTitle>
      <p className="intro">Ask what a caller might, and see the passages the agent would get.</p>
      <Space.Compact block>
        <Input
          aria-label="Question"
          placeholder="Do you deliver on Sundays?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onPressEnter={() => void search()}
          maxLength={500}
          allowClear
        />
        <Button
          icon={<SearchOutlined />}
          loading={searching}
          disabled={!question.trim()}
          onClick={() => void search()}
        >
          Ask
        </Button>
      </Space.Compact>
      {failure && <Alert type="error" showIcon title={failure} />}
      {hits && !failure && (
        <div role="status" aria-live="polite">
          {hits.length === 0 ? (
            <Nothing>
              Nothing in the knowledge base matches this, so the agent would say it doesn&apos;t
              know.
            </Nothing>
          ) : (
            <Hits aria-label={`Passages for "${asked}"`}>
              {hits.map((hit, index) => (
                <li key={`${hit.sourceId}-${index}`}>
                  <p className="from">
                    {index + 1} · {hit.title}
                  </p>
                  <p className="content">{hit.content}</p>
                </li>
              ))}
            </Hits>
          )}
        </div>
      )}
    </Box>
  );
}
