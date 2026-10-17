"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// A next/link that looks like an Ant Design button, for navigation actions.
// (antd's Button with `href` renders a plain anchor and reloads the page.)

type Variant = "primary" | "default" | "text";

const variants = {
  primary: css`
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentFg};

    &:hover {
      border-color: ${({ theme }) => theme.color.accentHover};
      background: ${({ theme }) => theme.color.accentHover};
    }
  `,
  default: css`
    border-color: ${({ theme }) => theme.color.lineStrong};
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.fg};

    &:hover {
      border-color: ${({ theme }) => theme.color.accentLine};
      color: ${({ theme }) => theme.color.accentText};
    }
  `,
  text: css`
    border-color: transparent;
    background: transparent;
    color: ${({ theme }) => theme.color.fgMuted};

    &:hover {
      background: ${({ theme }) => theme.color.hover};
      color: ${({ theme }) => theme.color.fg};
    }
  `,
};

export const LinkButton = styled(Link)<{ $variant?: Variant; $small?: boolean; $square?: boolean }>`
  ${({ $small }) => type($small ? "caption" : "body")}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  flex: none;
  height: ${({ theme, $small }) => theme.space($small ? 6 : 8)};
  width: ${({ theme, $square }) => ($square ? theme.space(8) : "auto")};
  padding-inline: ${({ theme, $small, $square }) => ($square ? 0 : theme.space($small ? 2 : 3.5))};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.radius.control};
  font-weight: 500;
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
  ${({ $variant = "default" }) => variants[$variant]}
`;
