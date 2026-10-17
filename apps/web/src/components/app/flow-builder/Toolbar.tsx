"use client";

import {
  ApartmentOutlined,
  ExpandOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  PhoneOutlined,
  RedoOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { SaveStatus } from "./useFlowEditor";

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: 52px;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
`;

const Divider = styled.span`
  width: 1px;
  height: 20px;
  background: ${({ theme }) => theme.color.line};
`;

const Spacer = styled.span`
  flex: 1;
`;

const Status = styled.div<{ $tone: "muted" | "warning" | "danger" }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("label")}
  font-weight: 400;
  white-space: nowrap;
  color: ${({ theme, $tone }) =>
    $tone === "danger"
      ? theme.color.danger
      : $tone === "warning"
        ? theme.color.warning
        : theme.color.fgSubtle};
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: currentColor;
`;

const Readiness = styled.button<{ $tone: "success" | "danger" }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: 32px;
  padding: 0 ${({ theme }) => theme.space(3)};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) =>
    $tone === "success" ? theme.color.successSoft : theme.color.dangerSoft};
  color: ${({ theme, $tone }) => ($tone === "success" ? theme.color.success : theme.color.danger)};
  ${type("label")}
  white-space: nowrap;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: currentColor;
  }
  small {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.warning};
  }
`;

const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";

function saveStatus(status: SaveStatus, error: string | null, retry: () => void): ReactNode {
  switch (status) {
    case "saved":
      return (
        <Status $tone="muted" role="status">
          <CheckOutlined /> Saved
        </Status>
      );
    case "saving":
      return (
        <Status $tone="muted" role="status">
          <LoadingOutlined /> Saving…
        </Status>
      );
    case "unsaved":
      return (
        <Status $tone="warning" role="status">
          <Dot /> Unsaved changes
        </Status>
      );
    case "error":
      return (
        <Status $tone="danger" role="alert">
          <Tooltip title={error}>
            <span>
              <ExclamationCircleFilled /> Save failed
            </span>
          </Tooltip>
          <Button size="small" onClick={retry}>
            Retry
          </Button>
        </Status>
      );
  }
}

export function Toolbar({
  status,
  saveError,
  onRetry,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTidy,
  onFit,
  ready,
  errors,
  warnings,
  onShowIssues,
  testHref,
  onAi,
}: {
  status: SaveStatus;
  saveError: string | null;
  onRetry: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTidy: () => void;
  onFit: () => void;
  ready: boolean;
  errors: number;
  warnings: number;
  onShowIssues: () => void;
  testHref: string;
  // Opens the AI flow builder.
  onAi?: () => void;
}) {
  const router = useRouter();
  const go = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.push(testHref);
  };
  const ok = ready && errors === 0;

  return (
    <Bar role="toolbar" aria-label="Flow builder">
      <Group>
        <Tooltip title={`Undo (${MOD}Z)`}>
          <Button
            type="text"
            icon={<UndoOutlined />}
            aria-label="Undo"
            disabled={!canUndo}
            onClick={onUndo}
          />
        </Tooltip>
        <Tooltip title={`Redo (${MOD === "⌘" ? "⇧⌘Z" : "Ctrl+Shift+Z"})`}>
          <Button
            type="text"
            icon={<RedoOutlined />}
            aria-label="Redo"
            disabled={!canRedo}
            onClick={onRedo}
          />
        </Tooltip>
      </Group>
      <Divider />
      <Tooltip title="Line every step up on straight rails">
        <Button type="text" icon={<ApartmentOutlined />} onClick={onTidy}>
          Tidy up
        </Button>
      </Tooltip>
      <Tooltip title="Fit the whole flow on screen (Shift+1)">
        <Button type="text" icon={<ExpandOutlined />} aria-label="Fit to screen" onClick={onFit} />
      </Tooltip>
      <Divider />
      <span data-tour="builder-save">{saveStatus(status, saveError, onRetry)}</span>
      <Spacer />
      {onAi && (
        <Tooltip title="Describe a change, or a whole new flow">
          <Button icon={<ThunderboltOutlined />} onClick={onAi}>
            Build with AI
          </Button>
        </Tooltip>
      )}
      <Tooltip title={ok && !warnings ? "Nothing to fix" : "Show what needs attention"}>
        <Readiness
          type="button"
          data-tour="builder-ready"
          $tone={ok ? "success" : "danger"}
          onClick={onShowIssues}
        >
          {ok ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
          {ok ? "Ready to take calls" : `${errors || 1} ${errors > 1 ? "issues" : "issue"}`}
          {warnings > 0 && (
            <small>
              <WarningFilled /> {warnings}
            </small>
          )}
        </Readiness>
      </Tooltip>
      <Tooltip title={ok ? "" : "Fix the issues first: this agent cannot take calls yet"}>
        <Button
          type={ok ? "primary" : "default"}
          icon={<PhoneOutlined />}
          href={testHref}
          data-tour="builder-test"
          onClick={go}
        >
          Test call
        </Button>
      </Tooltip>
    </Bar>
  );
}
