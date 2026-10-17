"use client";

import Link from "next/link";
import styled from "styled-components";
import type { Method } from "@/components/docs/ui";
import { type } from "@oxumi/ui/design/typography";
import { focusRing } from "../styles";

// The pieces every dropdown panel is built from.

export interface PanelProps {
  // Whether this panel is the one showing; live details only run while it is.
  open: boolean;
  // Called when a link in the panel is followed.
  onNavigate: () => void;
}

export const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Title = styled.p`
  ${type("overline")}
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

// A link with a title and a line under it.
export const Row = styled(Link)`
  ${focusRing}
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  column-gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.card};
  transition: background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  /* What leads the row: a step number or a colour marker. */
  > :first-child {
    grid-row: span 2;
  }
  strong {
    ${type("label")}
    grid-column: 2;
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    ${type("caption")}
    grid-column: 2;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover,
  &:focus-visible,
  &[data-on="true"] {
    background: ${({ theme }) => theme.color.hover};
  }
  &[aria-current="page"] strong {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

export const Numeral = styled.span`
  ${type("code")}
  color: ${({ theme }) => theme.color.accentText};
  font-size: ${({ theme }) => theme.text.caption.size};
`;

// A square of the use case's own colour.
export const Marker = styled.span`
  align-self: center;
  width: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(2)};
  border-radius: 2px;
  background: var(--tone);
`;

// A one-line link, for lists of lesser things.
export const Minor = styled(Link)`
  ${type("label")}
  ${focusRing}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  .anticon {
    font-size: 10px;
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  &:hover .anticon {
    transform: translateX(2px);
  }
`;

// GET, POST or DELETE, in the colours the docs use for them.
export const MethodTag = styled.span<{ $method: Method }>`
  flex: none;
  width: ${({ theme }) => theme.space(11)};
  padding-block: 1px;
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme, $method }) =>
    ({ GET: theme.color.infoSoft, POST: theme.color.successSoft, DELETE: theme.color.dangerSoft })[
      $method
    ]};
  color: ${({ theme, $method }) =>
    ({ GET: theme.color.info, POST: theme.color.success, DELETE: theme.color.danger })[$method]};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
`;

// A framed inset for a panel's live illustration.
export const Inset = styled.div`
  position: relative;
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.canvas};
`;

export const InsetHead = styled.div`
  ${type("caption")}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(8)};
  padding-inline: ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};
  white-space: nowrap;

  b {
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 500;
    text-overflow: ellipsis;
  }
  span {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 11px;
  }
`;
