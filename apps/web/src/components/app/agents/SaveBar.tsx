"use client";

import { Button } from "antd";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

const Bar = styled.div<{ $dirty: boolean }>`
  position: sticky;
  bottom: ${({ theme }) => theme.space(4)};
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)}
    ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border: 1px solid
    ${({ theme, $dirty }) => ($dirty ? theme.color.lineStrong : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme, $dirty }) => ($dirty ? theme.shadow.pop : "none")};
  transition: box-shadow ${({ theme }) => theme.motion.fast};

  .status {
    display: flex;
    flex: 1 1 100%;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    min-width: 0;
    ${type("label")}
    color: ${({ theme, $dirty }) => ($dirty ? theme.color.fg : theme.color.fgSubtle)};
  }
  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme, $dirty }) => ($dirty ? theme.color.accentLine : theme.color.fgFaint)};
  }
  .actions {
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
    margin-left: auto;
  }
  ${({ theme }) => theme.media.sm} {
    .status {
      flex: 1;
    }
  }
  /* Quiet, not tinted, while there is nothing to save. */
  .ant-btn:disabled {
    border-color: ${({ theme }) => theme.color.line};
    background: transparent;
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

// Sticks to the bottom of a form: what state it is in, and Reset / Save.
export function SaveBar({
  dirty,
  saving,
  onReset,
  onSave,
  note,
}: {
  dirty: boolean;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
  note?: ReactNode;
}) {
  return (
    <Bar $dirty={dirty} role="region" aria-label="Save changes" data-tour="save-bar">
      <div className="status" aria-live="polite">
        <span className="dot" aria-hidden />
        {note ?? (dirty ? "You have unsaved changes" : "All changes saved")}
      </div>
      <div className="actions">
        <Button onClick={onReset} disabled={!dirty || saving}>
          Reset
        </Button>
        <Button type="primary" onClick={onSave} disabled={!dirty} loading={saving}>
          Save changes
        </Button>
      </div>
    </Bar>
  );
}
