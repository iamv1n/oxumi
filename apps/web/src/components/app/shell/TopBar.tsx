"use client";

import { Tooltip } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { useHealth } from "@/lib/api";
import { routes } from "@/lib/routes";
import { Logo, Wordmark } from "@oxumi/ui/brand";
import GuideButton from "@/components/onboarding/GuideButton";
import { ThemeMenu } from "@oxumi/ui/theme/ThemeSwitch";
import { UserMenu } from "./UserMenu";

// The bar across the top of every console screen: the Oxumi mark, an
// optional context slot (the project switcher), a status area, the theme
// switch and the user menu.

const Bar = styled.header`
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.layout.topbar};
  flex: none;
  padding-inline: ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(4)};
  }
`;

const Brand = styled(Link)`
  ${type("heading")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  flex: none;
  height: ${({ theme }) => theme.space(9)};
  padding-inline: ${({ theme }) => theme.space(1.5)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fg};

  span:last-child {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    span:last-child {
      display: inline-flex;
    }
  }
`;

const Slash = styled.span`
  flex: none;
  width: 1px;
  height: ${({ theme }) => theme.space(5)};
  background: ${({ theme }) => theme.color.lineStrong};
  transform: rotate(18deg);
`;

const Context = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  flex: none;
  margin-left: auto;
`;

type Tone = "ok" | "warn" | "down" | "idle";

const StatusPill = styled.span<{ $tone: Tone }>`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(7)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
  cursor: default;

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme, $tone }) =>
      ({
        ok: theme.color.success,
        warn: theme.color.warning,
        down: theme.color.danger,
        idle: theme.color.fgFaint,
      })[$tone]};
  }

  b {
    display: none;
    font-weight: inherit;
  }
  ${({ theme }) => theme.media.sm} {
    b {
      display: inline;
    }
  }
`;

// Summarises what the API reports about itself, so a missing key or a stopped
// server is visible from every screen.
function ApiStatus() {
  const { data, error, isLoading } = useHealth();

  let tone: Tone = "idle";
  let label = "Checking API";
  let detail = "Contacting the Oxumi API.";
  if (error) {
    tone = "down";
    label = "API unreachable";
    detail = error.message;
  } else if (data) {
    const ready = data.providers.filter((p) => p.available).length;
    if (ready === 0) {
      tone = "warn";
      label = "No model configured";
      detail = "No language-model key is connected to this project. Calls will fail until you add one under Integrations.";
    } else if (!data.voice) {
      tone = "ok";
      label = "Text calls only";
      detail = "No speech provider is connected, so only text calls work. Add ElevenLabs or Sarvam under Integrations.";
    } else {
      tone = "ok";
      label = "All systems ready";
      detail = "A language model and a speech provider are connected.";
    }
  } else if (!isLoading) {
    // Outside a project there is no provider status to show.
    return null;
  }

  return (
    <Tooltip title={detail} placement="bottomRight">
      <StatusPill $tone={tone} role="status" tabIndex={0} aria-label={`${label}. ${detail}`}>
        <b>{label}</b>
      </StatusPill>
    </Tooltip>
  );
}

export function TopBar({
  context,
  actions,
  guide = true,
}: {
  // Shown after the mark: the project switcher inside a project.
  context?: ReactNode;
  // Extra controls on the right, between the API status and the user menu.
  actions?: ReactNode;
  // The guided-tour button. Off where there is no OnboardingProvider (admin).
  guide?: boolean;
}) {
  return (
    <Bar>
      <Brand href={routes.projects} aria-label="Oxumi, all projects">
        <Logo size={26} decorative />
        <span>
          <Wordmark size={10.5} decorative />
        </span>
      </Brand>
      {context && (
        <>
          <Slash aria-hidden />
          <Context>{context}</Context>
        </>
      )}
      <Right>
        <ApiStatus />
        {actions}
        <ThemeMenu />
        {guide && <GuideButton />}
        <span data-tour="user-menu">
          <UserMenu />
        </span>
      </Right>
    </Bar>
  );
}
