"use client";

import { ApiOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { ApiError } from "@/lib/api";

// What a page or panel shows when its data could not be loaded.

const Box = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme, $compact }) => theme.space($compact ? 8 : 16)}
    ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  text-align: center;

  .icon {
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(11)};
    height: ${({ theme }) => theme.space(11)};
    margin-bottom: ${({ theme }) => theme.space(4)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.dangerSoft};
    color: ${({ theme }) => theme.color.danger};
    font-size: 20px;
  }
  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    max-width: 28rem;
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(5)};
  }
`;

export function LoadError({
  error,
  what,
  title,
  onRetry,
  action,
  compact = false,
}: {
  error: ApiError;
  // The thing that failed to load, e.g. "projects".
  what: string;
  // Replaces the default "Couldn't load ..." heading.
  title?: string;
  onRetry?: () => void;
  action?: ReactNode;
  compact?: boolean;
}) {
  const unreachable = error.status === 0;
  return (
    <Box role="alert" $compact={compact}>
      <div className="icon" aria-hidden>
        {unreachable ? <ApiOutlined /> : <WarningOutlined />}
      </div>
      <h2>{unreachable ? "Can't reach the API" : (title ?? `Couldn't load ${what}`)}</h2>
      <p>{unreachable || !title ? error.message : what}</p>
      {(onRetry || action) && (
        <div className="actions">
          {onRetry && (
            <Button icon={<ReloadOutlined />} onClick={onRetry}>
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </Box>
  );
}
