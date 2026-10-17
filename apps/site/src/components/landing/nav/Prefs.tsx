"use client";

import { CheckOutlined, DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useEffect, useId, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { ThemeLabButton } from "@oxumi/ui/theme/ThemeLab";
import { ThemeSegment } from "@oxumi/ui/theme/ThemeSwitch";
import { useThemeMode } from "@oxumi/ui/design/theme-mode";
import { THEME_LAB_ENABLED } from "@oxumi/ui/design/theme-shared";
import { type } from "@oxumi/ui/design/typography";
import { EXAMPLE_LANGUAGES, useExampleLanguage } from "../language";
import { focusRing } from "./styles";

// One control for the two things a visitor can set: the language the example
// calls are spoken in (the site copy itself stays English) and how the site
// looks. Its face is a readout of both: a voice waveform beside the language,
// and the colour mode.

const speak = keyframes`
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
`;

const Root = styled.div`
  position: relative;
  display: none;

  ${({ theme }) => theme.media.sm} {
    display: block;
  }
`;

const Trigger = styled.button`
  ${type("label")}
  ${focusRing}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(8.5)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  /* The language's name is the first thing to go when the bar runs short. */
  .name {
    display: none;
  }
  ${({ theme }) => theme.media.lg} {
    .name {
      display: inline;
    }
  }
  .mode {
    display: inline-flex;
    padding-left: ${({ theme }) => theme.space(2)};
    border-left: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  &:hover,
  &[aria-expanded="true"] {
    border-color: ${({ theme }) => theme.color.lineStrong};
    color: ${({ theme }) => theme.color.fg};
  }
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.hover};
  }
`;

// Four bars of a voice. Still at rest; they speak while the control is
// hovered or open, and for a moment whenever the language changes.
const Wave = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: ${({ theme }) => theme.space(3)};

  i {
    width: 2px;
    height: 100%;
    border-radius: 1px;
    background: ${({ theme }) => theme.color.accentLine};
    transform: scaleY(0.35);
  }
  i:nth-child(2) {
    transform: scaleY(0.9);
  }
  i:nth-child(3) {
    transform: scaleY(0.6);
  }
  i:nth-child(4) {
    transform: scaleY(0.45);
  }

  &[data-said="true"] i {
    animation: ${speak} 620ms ease-in-out 2;
  }
  ${Trigger}:hover & i,
  ${Trigger}[aria-expanded="true"] & i {
    animation: ${speak} 620ms ease-in-out infinite;
  }
  && i:nth-child(2) {
    animation-delay: -410ms;
  }
  && i:nth-child(3) {
    animation-delay: -180ms;
  }
  && i:nth-child(4) {
    animation-delay: -520ms;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    && i {
      animation: none;
    }
  }
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space(3.5)});
  right: 0;
  width: ${({ theme }) => theme.space(66)};
  padding: ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.island};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  transform-origin: top right;
  transition:
    opacity ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    visibility 0s linear ${({ theme }) => theme.motion.base};
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px) scale(0.98);

  &[data-open="true"] {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 0s;
  }
`;

const Heading = styled.p`
  ${type("overline")}
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Option = styled.button`
  ${type("label")}
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  text-align: left;
  cursor: pointer;

  .anticon {
    color: ${({ theme }) => theme.color.accentText};
    font-size: 12px;
  }
  &:hover,
  &[aria-checked="true"] {
    color: ${({ theme }) => theme.color.fg};
  }
  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: -2px;
    box-shadow: none;
  }
`;

const Look = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(1)}
    ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  padding-top: ${({ theme }) => theme.space(3)};

  p {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Themes = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(1)} 0;
`;

export default function Prefs() {
  const { language, setLanguage } = useExampleLanguage();
  const { preference, mode } = useThemeMode();
  const [open, setOpen] = useState(false);
  // Counts language changes, to replay the waveform for each one.
  const [said, setSaid] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = EXAMPLE_LANGUAGES.find((option) => option.id === language)!;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onPointer);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <Root
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Trigger
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Preferences. Example calls in ${current.label}, ${preference === "system" ? "system" : mode} colour mode`}
        onClick={() => setOpen((value) => !value)}
      >
        <Wave key={said} data-said={said > 0} aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </Wave>
        <span className="name">{current.label}</span>
        <span className="mode" aria-hidden>
          {preference === "system" ? (
            <DesktopOutlined />
          ) : mode === "dark" ? (
            <MoonOutlined />
          ) : (
            <SunOutlined />
          )}
        </span>
      </Trigger>
      <Menu id={menuId} data-open={open}>
        <Heading id={`${menuId}-language`}>Example calls speak</Heading>
        <div role="radiogroup" aria-labelledby={`${menuId}-language`}>
          {EXAMPLE_LANGUAGES.map((option) => (
            <Option
              key={option.id}
              type="button"
              role="radio"
              aria-checked={language === option.id}
              onClick={() => {
                if (option.id !== language) setSaid((count) => count + 1);
                setLanguage(option.id);
              }}
            >
              {option.label}
              {language === option.id && <CheckOutlined aria-hidden />}
            </Option>
          ))}
        </div>
        <Look>
          <p>Appearance</p>
          <ThemeSegment labels={false} />
        </Look>
        {THEME_LAB_ENABLED && (
          <Themes>
            <ThemeLabButton onOpen={() => setOpen(false)} />
          </Themes>
        )}
      </Menu>
    </Root>
  );
}
