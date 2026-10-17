"use client";

import { useEffect, useState, type ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { copyText } from "./export";

// Small shared pieces of the brand page.

export const Block = styled.section`
  padding: ${({ theme }) => theme.space(12)} ${({ theme }) => theme.layout.gutter};
  scroll-margin-top: ${({ theme }) => theme.space(24)};

  ${({ theme }) => theme.media.md} {
    padding-block: ${({ theme }) => theme.space(16)};
  }

  > div {
    width: 100%;
    max-width: ${({ theme }) => theme.layout.content};
    margin-inline: auto;
  }
`;

export const BlockHead = styled.header`
  margin-bottom: ${({ theme }) => theme.space(8)};

  h2 {
    ${type("display")}
    font-size: clamp(2rem, 4.4vw, 3rem);
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
  p {
    ${type("lede")}
    max-width: 42rem;
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

export const Action = styled.button<{ $strong?: boolean }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(1.5)};
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme, $strong }) => ($strong ? "transparent" : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $strong }) => ($strong ? theme.color.fg : "transparent")};
  color: ${({ theme, $strong }) => ($strong ? theme.color.canvas : theme.color.fg)};
  white-space: nowrap;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast}, border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme, $strong }) => ($strong ? theme.color.fgMuted : theme.color.hover)};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }
`;

// The same look on a link: <Action as="a" href="…">.

// A button that copies text and says so for a moment.
export function CopyButton({
  text,
  children,
  done = "Copied",
  label,
}: {
  text: string | (() => string);
  children: ReactNode;
  done?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <Action
      type="button"
      aria-label={label}
      onClick={async () => setState((await copyText(typeof text === "function" ? text() : text)) ? "done" : "failed")}
    >
      <span aria-live="polite">{state === "done" ? done : state === "failed" ? "Copy failed" : children}</span>
    </Action>
  );
}
