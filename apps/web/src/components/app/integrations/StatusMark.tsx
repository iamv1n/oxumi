"use client";

import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
  MinusCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { STATUS, type Status, type Tone } from "./model";

// A provider's status as an icon and a word. Never colour alone.

const ICON: Record<Status, ReactNode> = {
  ok: <CheckCircleFilled />,
  untested: <ExclamationCircleFilled />,
  rejected: <CloseCircleFilled />,
  incomplete: <ExclamationCircleFilled />,
  platform: <SafetyCertificateOutlined />,
  none: <MinusCircleOutlined />,
};

export const Toned = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("label")}
  white-space: nowrap;
  color: ${({ theme, $tone }) =>
    $tone === "muted" ? theme.color.fgMuted : theme.color[$tone]};
`;

export function StatusMark({ status, busy }: { status: Status; busy?: boolean }) {
  if (busy)
    return (
      <Toned $tone="muted">
        <LoadingOutlined /> Testing…
      </Toned>
    );
  const { label, tone } = STATUS[status];
  return (
    <Toned $tone={tone}>
      {ICON[status]} {label}
    </Toned>
  );
}
