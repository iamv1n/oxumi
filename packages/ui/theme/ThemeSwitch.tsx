"use client";

import { CheckOutlined, DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tooltip } from "antd";
import { type ReactNode, useId, useState } from "react";
import styled from "styled-components";
import { useThemeMode } from "../design/theme-mode";
import type { ThemePreference } from "../design/theme-shared";
import { type } from "../design/typography";

// The three ways to choose light or dark, for the three places it is offered:
// a menu button for the app's top bar, a one-click toggle for pages with
// little chrome (sign-in, docs), and a set of cards for the account page.

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode; hint: string }[] = [
  { value: "light", label: "Light", icon: <SunOutlined />, hint: "Always light" },
  { value: "dark", label: "Dark", icon: <MoonOutlined />, hint: "Always dark" },
  { value: "system", label: "System", icon: <DesktopOutlined />, hint: "Matches your device" },
];

const Tick = styled(CheckOutlined)`
  margin-left: ${({ theme }) => theme.space(6)};
  color: ${({ theme }) => theme.color.accentText};
  font-size: 12px;
`;

// Top bar: an icon showing the current choice, opening a menu of all three.
export function ThemeMenu() {
  const { preference, mode, setPreference } = useThemeMode();
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((option) => option.value === preference)!;
  const title =
    preference === "system" ? `Theme: System (${mode} right now)` : `Theme: ${current.label}`;

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      menu={{
        selectable: true,
        selectedKeys: [preference],
        onClick: ({ key }) => setPreference(key as ThemePreference),
        items: OPTIONS.map((option) => ({
          key: option.value,
          icon: option.icon,
          label: option.label,
          extra: option.value === preference ? <Tick aria-hidden /> : undefined,
        })),
      }}
    >
      <Tooltip title={open ? "" : title} placement="bottomRight">
        <Button
          type="text"
          shape="circle"
          icon={current.icon}
          aria-label={`${title}. Change theme`}
          aria-haspopup="menu"
        />
      </Tooltip>
    </Dropdown>
  );
}

const Quiet = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: ${({ theme }) => theme.space(8)};
  height: ${({ theme }) => theme.space(8)};
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.color.fgSubtle};
  font-size: 15px;
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

// One click between light and dark, for pages without a settings menu. It
// sets an explicit preference; "System" is offered in the app and account.
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setPreference } = useThemeMode();
  const next = mode === "dark" ? "light" : "dark";
  const title = `Switch to ${next} theme`;
  return (
    <Tooltip title={title}>
      <Quiet
        type="button"
        className={className}
        aria-label={title}
        onClick={() => setPreference(next)}
      >
        {next === "light" ? <SunOutlined /> : <MoonOutlined />}
      </Quiet>
    </Tooltip>
  );
}

const Choices = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Choice = styled.label<{ $on: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid
    ${({ theme, $on }) => ($on ? theme.color.accentLine : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : "transparent")};
  cursor: pointer;
  transition:
    border-color ${({ theme }) => theme.motion.fast},
    background ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme, $on }) => ($on ? theme.color.accentLine : theme.color.fgSubtle)};
  }
  &:has(input:focus-visible) {
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .icon {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(8)};
    height: ${({ theme }) => theme.space(8)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme, $on }) => ($on ? "transparent" : theme.color.hover)};
    color: ${({ theme, $on }) => ($on ? theme.color.accentText : theme.color.fgMuted)};
    font-size: 16px;
  }
  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

// Account page: all three choices side by side, as a radio group.
export function ThemeChoices({ labelledBy }: { labelledBy?: string }) {
  const { preference, mode, setPreference } = useThemeMode();
  const name = useId();
  return (
    <Choices role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : "Theme"}>
      {OPTIONS.map((option) => {
        const on = option.value === preference;
        return (
          <Choice key={option.value} $on={on}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              onChange={() => setPreference(option.value)}
            />
            <span className="icon" aria-hidden>
              {option.icon}
            </span>
            <strong>{option.label}</strong>
            <small>
              {option.value === "system" && on ? `${option.hint} (${mode} now)` : option.hint}
            </small>
          </Choice>
        );
      })}
    </Choices>
  );
}

const Segment = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.hover};
`;

const SegmentOption = styled.button<{ $on: boolean }>`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  height: ${({ theme }) => theme.space(7)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $on }) => ($on ? theme.color.elevated : "transparent")};
  box-shadow: ${({ theme, $on }) => ($on ? `0 0 0 1px ${theme.color.lineStrong}` : "none")};
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  font-weight: 500;
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

// Light, dark and system side by side: for a menu sheet, a footer or a panel.
// `labels={false}` shows the icons alone.
export function ThemeSegment({ labels = true }: { labels?: boolean }) {
  const { preference, setPreference } = useThemeMode();
  return (
    <Segment role="radiogroup" aria-label="Colour mode">
      {OPTIONS.map((option) => (
        <SegmentOption
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === preference}
          aria-label={labels ? undefined : `${option.label} mode`}
          title={labels ? undefined : option.label}
          $on={option.value === preference}
          onClick={() => setPreference(option.value)}
        >
          {option.icon}
          {labels && option.label}
        </SegmentOption>
      ))}
    </Segment>
  );
}

export const themeLabel = (preference: ThemePreference, mode: string) =>
  preference === "system"
    ? `System (${mode} right now)`
    : OPTIONS.find((option) => option.value === preference)!.label;
