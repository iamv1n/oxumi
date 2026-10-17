"use client";

import { BgColorsOutlined, CheckOutlined, CloseOutlined, CopyOutlined, UndoOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styled from "styled-components";
import { BRAND_LABELS, BRANDS, DEFAULT_BRAND } from "../design/palettes";
import { useThemeMode } from "../design/theme-mode";
import { type Brand, THEME_LAB_ENABLED } from "../design/theme-shared";
import { paletteFor, shadowFor } from "../design/tokens";
import { type } from "../design/typography";
import { ThemeSegment } from "./ThemeSwitch";

// The Theme Lab: an experiment for trying the product in six brand themes.
// A floating "Themes" button on every page opens a panel of swatch cards; the
// site nav and footer open the same panel through <ThemeLabButton>. Picking a
// theme restyles everything at once and is remembered in this browser.
//
// To remove the experiment, set THEME_LAB_ENABLED to false in
// design/theme-shared.ts: the button, the panel and the nav and footer
// entries all disappear, and everyone is back on the original theme.

// Whether the panel is open, shared by every button that can open it.
let open = false;
const watchers = new Set<() => void>();
const setOpen = (next: boolean) => {
  if (open === next) return;
  open = next;
  watchers.forEach((watcher) => watcher());
};
const watch = (watcher: () => void) => {
  watchers.add(watcher);
  return () => void watchers.delete(watcher);
};
const useLabOpen = () =>
  useSyncExternalStore(
    watch,
    () => open,
    () => false,
  );

const Fab = styled.button<{ $open: boolean }>`
  ${type("label")}
  position: fixed;
  right: ${({ theme }) => theme.space(4)};
  bottom: ${({ theme }) => theme.space(4)};
  z-index: 1100;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(9)};
  padding-inline: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  color: ${({ theme, $open }) => ($open ? theme.color.fg : theme.color.fgMuted)};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    border-color: ${({ theme }) => theme.color.accentLine};
    color: ${({ theme }) => theme.color.fg};
  }
  .anticon {
    color: ${({ theme }) => theme.color.accentText};
    font-size: 15px;
  }
  /* Small screens: the icon alone, so it covers as little as possible. */
  span.label {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    span.label {
      display: inline;
    }
  }
  @media print {
    display: none;
  }
`;

const Panel = styled.div`
  position: fixed;
  right: ${({ theme }) => theme.space(4)};
  bottom: ${({ theme }) => theme.space(15)};
  z-index: 1100;
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - ${({ theme }) => theme.space(8)}));
  max-height: calc(100dvh - ${({ theme }) => theme.space(20)});
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  color: ${({ theme }) => theme.color.fg};
  overflow: hidden;

  &:focus-visible {
    box-shadow: ${({ theme }) => theme.shadow.pop};
  }
`;

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)}
    ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  div {
    flex: 1;
    min-width: 0;
  }
  h2 {
    ${type("label")}
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
  }
  h2 small {
    ${type("overline")}
    font-size: 0.625rem;
    padding: 0 ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accentText};
  }
  p {
    ${type("caption")}
    margin-top: 2px;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const IconButton = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ theme }) => theme.space(7)};
  height: ${({ theme }) => theme.space(7)};
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme }) => theme.color.fgSubtle};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)};
  overflow-y: auto;
`;

const Card = styled.button<{ $on: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.accentLine : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : "transparent")};
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    border-color: ${({ theme, $on }) => ($on ? theme.color.accentLine : theme.color.fgSubtle)};
  }
  strong {
    ${type("label")}
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fg};
  }
  strong .anticon {
    color: ${({ theme }) => theme.color.accentText};
    font-size: 12px;
  }
  small {
    ${type("caption")}
    font-size: 0.6875rem;
    line-height: 0.9375rem;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

// A thumbnail of the theme itself: its own canvas, a card, the gradient
// headline, the accent button and the three brand colours. Drawn from the
// palette's real values, so it shows a theme other than the one applied.
const Preview = styled.span`
  position: relative;
  display: block;
  height: ${({ theme }) => theme.space(14)};
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;

  i {
    position: absolute;
    display: block;
  }
  .card {
    inset: 8px 8px auto 8px;
    height: 26px;
    border-radius: 4px;
  }
  .headline {
    left: 14px;
    top: 15px;
    width: 46%;
    height: 5px;
    border-radius: 3px;
  }
  .text {
    left: 14px;
    top: 24px;
    width: 30%;
    height: 3px;
    border-radius: 2px;
    opacity: 0.55;
  }
  .button {
    right: 14px;
    top: 14px;
    width: 26px;
    height: 12px;
    border-radius: 6px;
  }
  .dot {
    bottom: 7px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
`;

function ThemePreview({ brand }: { brand: Brand }) {
  const { mode } = useThemeMode();
  const palette = paletteFor(mode, brand);
  const dots = [palette.accent, palette.pink, palette.violet, palette.success, palette.info];
  return (
    <Preview aria-hidden style={{ background: palette.canvas, border: `1px solid ${palette.lineStrong}` }}>
      <i className="card" style={{ background: palette.surface, boxShadow: `0 0 0 1px ${palette.line}` }} />
      <i
        className="headline"
        style={{
          background: `linear-gradient(90deg, ${palette.accentLine}, ${palette.pink}, ${palette.violet})`,
        }}
      />
      <i className="text" style={{ background: palette.fgMuted }} />
      <i className="button" style={{ background: palette.accent }} />
      {dots.map((dot, i) => (
        <i key={i} className="dot" style={{ left: 10 + i * 14, background: dot }} />
      ))}
    </Preview>
  );
}

const Foot = styled.footer`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(2)};
  }
  .row > span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Action = styled.button`
  ${type("caption")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  height: ${({ theme }) => theme.space(7)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme }) => theme.color.fg};
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.accentLine};
    color: ${({ theme }) => theme.color.accentText};
  }
  &:disabled {
    color: ${({ theme }) => theme.color.fgFaint};
    cursor: default;
  }
`;

function LabPanel() {
  const { brand, mode, setBrand } = useThemeMode();
  const panel = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  // Focus moves into the panel; Escape closes it.
  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = async () => {
    const tokens = {
      theme: brand,
      name: BRAND_LABELS[brand].name,
      mode,
      color: paletteFor(mode, brand),
      shadow: shadowFor(mode, brand),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(tokens, null, 2));
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied(null), 2200);
  };

  return (
    <Panel ref={panel} id="theme-lab" role="dialog" aria-label="Theme Lab" tabIndex={-1}>
      <Head>
        <div>
          <h2>
            Themes <small>Experiment</small>
          </h2>
          <p>Try Oxumi in a different palette. It changes everything, in this browser only.</p>
        </div>
        <IconButton type="button" aria-label="Close themes" onClick={() => setOpen(false)}>
          <CloseOutlined />
        </IconButton>
      </Head>
      <Cards role="radiogroup" aria-label="Theme">
        {BRANDS.map((id) => {
          const on = id === brand;
          return (
            <Card
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              $on={on}
              onClick={() => setBrand(id)}
            >
              <ThemePreview brand={id} />
              <strong>
                {BRAND_LABELS[id].name}
                {on && <CheckOutlined aria-hidden />}
              </strong>
              <small>{BRAND_LABELS[id].note}</small>
            </Card>
          );
        })}
      </Cards>
      <Foot>
        <div className="row">
          <span>Mode</span>
          <ThemeSegment />
        </div>
        <div className="row">
          <Action type="button" disabled={brand === DEFAULT_BRAND} onClick={() => setBrand(DEFAULT_BRAND)}>
            <UndoOutlined aria-hidden />
            Reset to original
          </Action>
          <Action type="button" onClick={() => void copy()} aria-live="polite">
            {copied === "yes" ? <CheckOutlined aria-hidden /> : <CopyOutlined aria-hidden />}
            {copied === "yes" ? "Copied" : copied === "failed" ? "Could not copy" : "Copy theme tokens"}
          </Action>
        </div>
      </Foot>
    </Panel>
  );
}

// Mounted once, in Providers: the floating button and, when open, the panel.
export default function ThemeLab() {
  const isOpen = useLabOpen();
  if (!THEME_LAB_ENABLED) return null;
  return (
    <>
      {isOpen && <LabPanel />}
      <Fab
        type="button"
        $open={isOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "theme-lab" : undefined}
        aria-label={isOpen ? "Close themes" : "Themes: try a different colour theme"}
        onClick={() => setOpen(!isOpen)}
      >
        <BgColorsOutlined aria-hidden />
        <span className="label">Themes</span>
      </Fab>
    </>
  );
}

const Entry = styled.button`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(8)};
  padding-inline: ${({ theme }) => theme.space(2)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

// Another way into the same panel, for the site nav, its mobile sheet and the
// footer. `compact` shows the icon alone. Renders nothing when the lab is off.
export function ThemeLabButton({
  compact = false,
  className,
  onOpen,
}: {
  compact?: boolean;
  className?: string;
  // Called after opening, e.g. to close the menu the button sits in.
  onOpen?: () => void;
}) {
  if (!THEME_LAB_ENABLED) return null;
  return (
    <Entry
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-label={compact ? "Themes: try a different colour theme" : undefined}
      title={compact ? "Themes" : undefined}
      onClick={() => {
        setOpen(true);
        onOpen?.();
      }}
    >
      <BgColorsOutlined aria-hidden />
      {!compact && "Themes"}
    </Entry>
  );
}
