"use client";

import { HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Skeleton, Tooltip } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { LoadError } from "@/components/app/agents/states";
import { Empty, Panel } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { type AuditEvent, useAuditLog } from "@/lib/api";
import { actorName, describe } from "./activity";
import { SectionHead, When } from "./ui";

const PAGE = 25;

const Rows = styled.ol`
  display: flex;
  flex-direction: column;
`;

const Row = styled.li`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  &:last-child {
    border-bottom: 0;
  }
  .what {
    ${type("body")}
    flex: 1 1 18rem;
    min-width: 0;
    color: ${({ theme }) => theme.color.fgMuted};
    overflow-wrap: anywhere;
  }
  .who,
  .what b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  .what code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
  }
  .system {
    color: ${({ theme }) => theme.color.accentText};
  }
  .when {
    ${type("caption")}
  }
`;

const More = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const Note = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

function Who({ event }: { event: AuditEvent }) {
  if (event.actorId === null && event.actorLabel === "Oxumi")
    return <span className="who system">Oxumi</span>;
  const name = actorName(event.actorLabel);
  if (name === event.actorLabel) return <span className="who">{name}</span>;
  return (
    <Tooltip title={event.actorLabel}>
      <span className="who" tabIndex={0}>
        {name}
      </span>
    </Tooltip>
  );
}

// Who changed what in the project, newest first. Every member can read it.
export function ActivityLog({ projectId }: { projectId: string }) {
  const log = useAuditLog(projectId);
  const [shown, setShown] = useState(PAGE);
  const events = log.data ?? [];

  return (
    <section aria-labelledby="team-activity">
      <SectionHead>
        <h2 id="team-activity">Activity</h2>
        <p>Changes made in this project, newest first.</p>
        <div className="actions">
          <Tooltip title="Refresh">
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              aria-label="Refresh activity"
              loading={log.isValidating}
              onClick={() => void log.mutate()}
            />
          </Tooltip>
        </div>
      </SectionHead>
      {log.error && !log.data ? (
        <LoadError
          title="Activity could not be loaded"
          error={log.error}
          onRetry={() => void log.mutate()}
        />
      ) : !log.data ? (
        <Panel aria-busy aria-label="Loading activity">
          <Skeleton active title={false} paragraph={{ rows: 5 }} />
        </Panel>
      ) : events.length === 0 ? (
        <Empty
          icon={<HistoryOutlined />}
          title="Nothing yet"
          description="Changes to agents, keys, members and settings will be listed here."
        />
      ) : (
        <>
          <Panel $padded={false}>
            <Rows aria-label="Activity">
              {events.slice(0, shown).map((event) => (
                <Row key={event.id}>
                  <span className="what">
                    <Who event={event} /> {describe(event)}
                  </span>
                  <span className="when">
                    <When iso={event.createdAt} />
                  </span>
                </Row>
              ))}
            </Rows>
            {events.length > shown && (
              <More>
                <Button size="small" onClick={() => setShown((n) => n + PAGE)}>
                  Show more
                </Button>
              </More>
            )}
          </Panel>
          {events.length >= 100 && shown >= events.length && (
            <Note>Showing the latest 100 changes.</Note>
          )}
        </>
      )}
    </section>
  );
}
