"use client";

import { CheckOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// A numbered run of steps, used for first-run and getting-started guidance:
// columns divided by hairlines on wide screens, stacked rows on narrow ones.

export interface Step {
  title: string;
  description: string;
  done?: boolean;
  // The step to do next; its number is drawn in the accent colour.
  current?: boolean;
  action?: ReactNode;
}

const List = styled.ol`
  display: grid;

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    > li + li {
      border-top: 0;
      border-left: 1px solid ${({ theme }) => theme.color.line};
    }
  }
`;

const Item = styled.li<{ $current: boolean; $done: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  align-content: start;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};

  .badge {
    ${type("caption")}
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(5)};
    height: ${({ theme }) => theme.space(5)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme, $current, $done }) =>
      $done ? theme.color.successSoft : $current ? theme.color.accentSoft : theme.color.hover};
    color: ${({ theme, $current, $done }) =>
      $done ? theme.color.success : $current ? theme.color.accentText : theme.color.fgMuted};
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  h3 {
    ${type("label")}
    align-self: center;
    color: ${({ theme, $done }) => ($done ? theme.color.fgMuted : theme.color.fg)};
  }
  p,
  .action {
    grid-column: 2;
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .action {
    margin-top: ${({ theme }) => theme.space(2)};
  }
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

export function Steps({ steps }: { steps: Step[] }) {
  return (
    <List>
      {steps.map((step, index) => (
        <Item
          key={step.title}
          $current={Boolean(step.current)}
          $done={Boolean(step.done)}
          aria-current={step.current ? "step" : undefined}
        >
          <span className="badge" aria-hidden>
            {step.done ? <CheckOutlined /> : index + 1}
          </span>
          <h3>
            {step.title}
            {step.done && <SrOnly> (done)</SrOnly>}
          </h3>
          <p>{step.description}</p>
          {step.action && <div className="action">{step.action}</div>}
        </Item>
      ))}
    </List>
  );
}
