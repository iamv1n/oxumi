"use client";

import { DownOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { type ReactNode, useId } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// Container width from which the console lays its zones side by side. Below
// it they stack, and a collapsed panel is a bar instead of a rail.
export const WIDE = "920px";
export const RAIL = "44px";

// ---- Side panels ------------------------------------------------------------

const Shell = styled.aside`
  position: relative;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.color.surface};

  @container (min-width: ${WIDE}) {
    overflow: hidden;
  }
`;

// The whole panel. It keeps its full width while the column around it
// narrows, so its content is clipped away instead of being squeezed.
const Full = styled.div<{ $open: boolean; $width: number }>`
  display: ${({ $open }) => ($open ? "flex" : "none")};
  flex-direction: column;
  min-height: 0;

  @container (min-width: ${WIDE}) {
    display: flex;
    width: ${({ $width }) => $width}px;
    height: 100%;
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
    transition:
      opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
      visibility 0s linear ${({ $open, theme }) => ($open ? "0s" : theme.motion.base)};
  }
`;

// What is left of a collapsed panel: a bar when stacked, a rail when wide.
const Slim = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? "none" : "flex")};
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: 40px;
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};

  .title {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  .grow {
    flex: 1;
  }

  @container (min-width: ${WIDE}) {
    position: absolute;
    inset: 0 auto 0 0;
    display: flex;
    flex-direction: column;
    width: ${RAIL};
    padding: ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(3)};
    opacity: ${({ $open }) => ($open ? 0 : 1)};
    visibility: ${({ $open }) => ($open ? "hidden" : "visible")};
    transition:
      opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
      visibility 0s linear ${({ $open, theme }) => ($open ? theme.motion.base : "0s")};

    .title,
    .grow {
      display: none;
    }
  }
`;

export function PanelToggle({
  open,
  side,
  name,
  controls,
  onToggle,
}: {
  open: boolean;
  side: "left" | "right";
  // "setup" or "live state", for the label.
  name: string;
  controls: string;
  onToggle: () => void;
}) {
  const label = `${open ? "Collapse" : "Expand"} ${name}`;
  // The icon points the way the panel will move.
  const pointsLeft = side === "left" ? open : !open;
  return (
    <Tooltip title={label} placement={side === "left" ? "right" : "left"}>
      <Button
        type="text"
        size="small"
        aria-label={label}
        aria-expanded={open}
        aria-controls={controls}
        icon={pointsLeft ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        onClick={onToggle}
      />
    </Tooltip>
  );
}

// A side zone that collapses to a slim summary. `children` receives the
// toggle to place in its own header.
export function SidePanel({
  open,
  side,
  name,
  label,
  width,
  slim,
  onToggle,
  children,
}: {
  open: boolean;
  side: "left" | "right";
  name: string;
  label: string;
  width: number;
  // Shown beside the expand button while collapsed.
  slim: ReactNode;
  onToggle: () => void;
  children: (toggle: ReactNode) => ReactNode;
}) {
  const id = useId();
  const toggle = (
    <PanelToggle open={open} side={side} name={name} controls={id} onToggle={onToggle} />
  );
  return (
    <Shell aria-label={label}>
      <Slim $open={open} inert={open}>
        {toggle}
        <span className="title">{label}</span>
        {slim}
      </Slim>
      <Full id={id} $open={open} $width={width} inert={!open}>
        {children(toggle)}
      </Full>
    </Shell>
  );
}

// ---- Sections inside a panel -------------------------------------------------

const SectionBox = styled.section`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const SectionButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  width: 100%;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.fgSubtle};
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }
  .chevron {
    font-size: 10px;
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
    ${({ $open }) =>
      !$open &&
      css`
        transform: rotate(-90deg);
      `}
  }
  .name {
    ${type("overline")}
    flex: 1;
    min-width: 0;
  }
  .summary {
    ${type("caption")}
    font-variant-numeric: tabular-nums;
    color: ${({ theme, $open }) => ($open ? theme.color.fgSubtle : theme.color.fgMuted)};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Reveal = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-rows ${({ theme }) => theme.motion.base}
    ${({ theme }) => theme.motion.ease};

  > div {
    min-height: 0;
    overflow: hidden;
    visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
    transition: visibility 0s linear
      ${({ $open, theme }) => ($open ? "0s" : theme.motion.base)};
  }
`;

const SectionBody = styled.div`
  padding: 0 ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(3)};
`;

// A titled block that folds down to its one-line summary.
export function Section({
  title,
  summary,
  open,
  onToggle,
  tour,
  children,
}: {
  title: string;
  // Always shown beside the title; it is all that remains when folded.
  summary: string;
  open: boolean;
  onToggle: () => void;
  tour?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <SectionBox aria-label={title} data-tour={tour}>
      <h3>
        <SectionButton
          type="button"
          $open={open}
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
        >
          <DownOutlined className="chevron" />
          <span className="name">{title}</span>
          <span className="summary">{summary}</span>
        </SectionButton>
      </h3>
      <Reveal $open={open}>
        <div id={id} inert={!open}>
          <SectionBody>{children}</SectionBody>
        </div>
      </Reveal>
    </SectionBox>
  );
}
