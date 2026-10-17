"use client";

import {
  DeleteOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  GlobalOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { App, Button, Tag, Tooltip } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { formatDateTime } from "@/components/app/kit";
import { formatRelative, plural } from "@/components/app/projects/format";
import {
  ApiError,
  type KnowledgeSource,
  refreshKnowledgeSource,
  removeKnowledge,
} from "@/lib/api";
import { RoleTip } from "./RoleTip";

// The sources in a project's knowledge base, one row each.

const List = styled.ul`
  > li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  }
  > li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  .kind {
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(8)};
    height: ${({ theme }) => theme.space(8)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .main {
    min-width: 0;
  }
  .title {
    ${type("label")}
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  .title .ant-tag {
    margin: 0;
  }
  .url {
    ${type("caption")}
    display: block;
    overflow: hidden;
    color: ${({ theme }) => theme.color.accentText};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .url:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
  .meta {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(0.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .error {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.danger};
  }
  .actions {
    grid-column: 2;
    display: flex;
    gap: ${({ theme }) => theme.space(1)};
  }

  /* From the sm breakpoint the actions sit at the end of the row. */
  ${({ theme }) => theme.media.sm} {
    > li {
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
    }
    .actions {
      grid-column: 3;
    }
  }
`;

export function SourceList({
  projectId,
  sources,
  canEdit,
}: {
  projectId: string;
  sources: KnowledgeSource[];
  canEdit: boolean;
}) {
  const { message, modal } = App.useApp();
  // The source a refresh or delete is running for.
  const [working, setWorking] = useState<string | null>(null);

  const refresh = async (source: KnowledgeSource) => {
    setWorking(source.id);
    try {
      const next = await refreshKnowledgeSource(projectId, source.id);
      if (next.status === "failed")
        message.warning(`Could not read the page: ${next.error ?? "unknown error"}`);
      else message.success(`Refreshed "${next.title}"`);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not refresh the page.");
    } finally {
      setWorking(null);
    }
  };

  const remove = (source: KnowledgeSource) =>
    modal.confirm({
      title: `Delete "${source.title}"?`,
      icon: <ExclamationCircleFilled />,
      content: "Agents will stop answering from it straight away.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        setWorking(source.id);
        try {
          await removeKnowledge(projectId, source.id);
          message.success(`Deleted "${source.title}"`);
        } catch (err) {
          message.error(err instanceof ApiError ? err.message : "Could not delete the source.");
        } finally {
          setWorking(null);
        }
      },
    });

  const tip = "Editors and above can change sources";

  return (
    <List>
      {sources.map((source) => (
        <li key={source.id}>
          <span className="kind" aria-hidden>
            {source.kind === "url" ? <GlobalOutlined /> : <FileTextOutlined />}
          </span>
          <div className="main">
            <div className="title">
              {source.title}
              {source.status === "failed" && (
                <Tag color="error" variant="filled">
                  Failed
                </Tag>
              )}
            </div>
            {source.kind === "url" && source.url && (
              <a className="url" href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>
            )}
            <p className="meta">
              {source.kind === "url" ? "Web page" : "Text"} ·{" "}
              {plural(source.chunks, "passage")} · {plural(source.characters, "character")} ·{" "}
              <Tooltip title={formatDateTime(source.updatedAt)}>
                <span>Updated {formatRelative(source.updatedAt)}</span>
              </Tooltip>
            </p>
            {source.status === "failed" && (
              <p className="error">{source.error ?? "The source could not be read."}</p>
            )}
          </div>
          <div className="actions">
            {source.kind === "url" && (
              <RoleTip allowed={canEdit} title={tip}>
                <Tooltip title={canEdit ? "Fetch the page again" : undefined}>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    aria-label={`Refresh ${source.title}`}
                    disabled={!canEdit || (working !== null && working !== source.id)}
                    loading={working === source.id}
                    onClick={() => void refresh(source)}
                  >
                    Refresh
                  </Button>
                </Tooltip>
              </RoleTip>
            )}
            <RoleTip allowed={canEdit} title={tip}>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${source.title}`}
                disabled={!canEdit || working === source.id}
                onClick={() => remove(source)}
              />
            </RoleTip>
          </div>
        </li>
      ))}
    </List>
  );
}
