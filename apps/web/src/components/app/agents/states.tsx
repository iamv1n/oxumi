"use client";

import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Skeleton } from "antd";
import type { ReactNode } from "react";
import styled from "styled-components";
import { Panel } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";

// Loading and error states shared by the agent and call pages.

const ErrorBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.space(14)} ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  text-align: center;

  .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-bottom: ${({ theme }) => theme.space(4)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.dangerSoft};
    color: ${({ theme }) => theme.color.danger};
    font-size: 20px;
  }
  h2 {
    ${type("heading")}
  }
  p {
    ${type("body")}
    max-width: 28rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .action {
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(5)};
  }
`;

export function LoadError({
  title,
  error,
  onRetry,
  action,
}: {
  title: string;
  error?: { message: string; status?: number } | null;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <ErrorBox role="alert">
      <div className="icon">
        <WarningOutlined />
      </div>
      <h2>{title}</h2>
      <p>{error?.message ?? "Something went wrong. Try again in a moment."}</p>
      {(onRetry || action) && (
        <div className="action">
          {onRetry && (
            <Button icon={<ReloadOutlined />} onClick={onRetry}>
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </ErrorBox>
  );
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
`;

const HeaderSkeleton = styled.div`
  margin-bottom: ${({ theme }) => theme.space(8)};
`;

// A title line and a few panels of placeholder rows.
export function PageSkeleton({ panels = 2, rows = 4 }: { panels?: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <HeaderSkeleton>
        <Skeleton active title={{ width: 220 }} paragraph={{ rows: 1, width: 420 }} />
      </HeaderSkeleton>
      <Stack>
        {Array.from({ length: panels }, (_, i) => (
          <Panel key={i}>
            <Skeleton active title={{ width: 160 }} paragraph={{ rows }} />
          </Panel>
        ))}
      </Stack>
    </div>
  );
}

// Placeholder rows for a table that has not loaded yet.
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  &:last-child {
    border-bottom: 0;
  }
  > :first-child {
    flex: 1;
  }
`;

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Panel $padded={false} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Row key={i}>
          <Skeleton active title={{ width: `${55 - i * 6}%` }} paragraph={false} />
          <Skeleton.Button active size="small" />
          <Skeleton.Button active size="small" />
          <Skeleton.Button active size="small" />
        </Row>
      ))}
    </Panel>
  );
}
