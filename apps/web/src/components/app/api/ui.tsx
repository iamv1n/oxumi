"use client";

import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// The shared look of the API page: every view opens with the same header,
// puts its data in the same hairline boxes and tables, and speaks about
// state with the same dots.

// ---- View header ----------------------------------------------------------

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  min-height: ${({ theme }) => theme.space(8)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  .text {
    flex: 1 1 320px;
    min-width: 0;
  }
  h2 {
    ${type("label")}
    display: inline;
    margin-right: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fg};
    font-size: ${({ theme }) => theme.text.body.size};
    font-weight: 600;
  }
  p {
    ${type("label")}
    display: inline;
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
  p b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  .docs-link {
    ${type("caption")}
    border-radius: ${({ theme }) => theme.radius.small};
    color: ${({ theme }) => theme.color.accentText};
    font-weight: 500;
  }
  .docs-link:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    margin-left: auto;
  }
`;

// Title, one sentence, and the view's controls on the right.
export function ViewHeader({
  title,
  children,
  actions,
}: {
  title: string;
  // The sentence that says what this view is for.
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Header>
      <div className="text">
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </Header>
  );
}

// ---- Boxes ----------------------------------------------------------------

export const Box = styled.section`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`;

export const BoxHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 ${({ theme }) => theme.space(3)};
  min-height: ${({ theme }) => theme.space(9)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)}
    ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  .meta {
    ${type("caption")}
    margin-right: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  h3:only-child {
    margin-right: auto;
  }
`;

export const BoxBody = styled.div`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
`;

// A quiet line for "nothing here" inside a box.
export const Quiet = styled.p`
  ${type("label")}
  padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 400;
  text-align: center;
`;

// ---- Tables ---------------------------------------------------------------

// Dresses an antd Table as a dense developer-tool grid: small caps headings,
// 40px rows, hairlines between rows only.
export const tableLook = css`
  .ant-table-wrapper .ant-table {
    background: transparent;
  }
  && .ant-table-thead > tr > th {
    ${type("overline")}
    height: ${({ theme }) => theme.space(8)};
    padding: 0 ${({ theme }) => theme.space(2)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    background: transparent;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  && .ant-table-thead > tr > th::before {
    display: none;
  }
  && .ant-table-tbody > tr > td {
    ${type("label")}
    height: ${({ theme }) => theme.space(10)};
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
    white-space: nowrap;
  }
  && .ant-table-tbody > tr:last-child > td {
    border-bottom: 0;
  }
  && .ant-table-thead > tr > th:first-child,
  && .ant-table-tbody > tr > td:first-child {
    padding-left: ${({ theme }) => theme.space(4)};
  }
  && .ant-table-thead > tr > th:last-child,
  && .ant-table-tbody > tr > td:last-child {
    padding-right: ${({ theme }) => theme.space(2)};
  }
  .ant-table-tbody > tr.clickable {
    cursor: pointer;
  }
  /* The row whose code is showing in the code panel. */
  && .ant-table-tbody > tr.selected > td {
    background: ${({ theme }) => theme.color.accentSoft};
  }
  && .ant-table-tbody > tr.selected > td:first-child {
    box-shadow: inset 2px 0 0 ${({ theme }) => theme.color.accentLine};
  }
  .ant-table-tbody > tr.clickable:focus-visible > td {
    background: ${({ theme }) => theme.color.hover};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.accentLine};
  }
`;

export const TableBox = styled(Box)`
  ${tableLook}
`;

// ---- Small parts ----------------------------------------------------------

export type Tone = "ok" | "warn" | "bad" | "idle";

export const toneColor = css<{ $tone: Tone }>`
  ${({ theme, $tone }) =>
    ({
      ok: theme.color.success,
      warn: theme.color.warning,
      bad: theme.color.danger,
      idle: theme.color.fgFaint,
    })[$tone]}
`;

// A state as a dot and a word, never colour alone.
export const State = styled.span<{ $tone: Tone }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme, $tone }) => ($tone === "idle" ? theme.color.fgSubtle : theme.color.fg)};
  font-weight: 400;
  white-space: nowrap;

  &::before {
    content: "";
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${toneColor};
  }
`;

export const Mono = styled.code`
  ${type("code")}
  color: ${({ theme }) => theme.color.fgMuted};
`;

export const Soft = styled.span`
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;
`;

// An HTTP method as coloured mono text.
export const Method = styled.span<{ $method: string }>`
  ${type("code")}
  display: inline-block;
  min-width: ${({ theme }) => theme.space(14)};
  font-size: ${({ theme }) => theme.text.caption.size};
  font-weight: 600;
  color: ${({ theme, $method }) =>
    $method === "GET"
      ? theme.color.info
      : $method === "DELETE"
        ? theme.color.danger
        : theme.color.success};
`;

export const RowActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(1)};
`;

// A compact, purposeful empty state: what the thing is, and the one action.
const EmptyBox = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(4)};

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: ${({ theme }) => theme.space(8)};
    height: ${({ theme }) => theme.space(8)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .text {
    flex: 1 1 320px;
    min-width: 0;
  }
  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  p {
    ${type("label")}
    max-width: 46rem;
    margin-top: ${({ theme }) => theme.space(0.5)};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
`;

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <EmptyBox>
      <span className="icon" aria-hidden>
        {icon}
      </span>
      <div className="text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      {action}
    </EmptyBox>
  );
}

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(5)};
`;

export const ModalLead = styled.p`
  ${type("label")}
  margin: ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 400;

  b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
`;
