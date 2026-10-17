"use client";

import { CheckOutlined, CopyOutlined, DownOutlined } from "@ant-design/icons";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { type } from "../design/typography";
import { type CodeLanguage, highlight, type TokenKind } from "./highlight";
import {
  languageInfo,
  SAMPLE_LANGUAGES,
  type SampleLanguage,
  type Samples,
  useSampleLanguage,
} from "./languages";

// Code as the docs and the app show it: highlighted, copyable, and in the
// reader's chosen language. Everything here reads colours from the theme, so
// a block follows the surface it sits on: wrap it in <CodeSurface> to put it
// on the dark palette whatever the page's mode.

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Copy
      type="button"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      $done={copied}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <CheckOutlined /> : <CopyOutlined />}
    </Copy>
  );
}

function Lines({ code, language }: { code: string; language: CodeLanguage }) {
  const lines = useMemo(() => highlight(code, language), [code, language]);
  return (
    <code>
      {lines.map((tokens, i) => (
        <Line key={i}>
          {tokens.length
            ? tokens.map((token, j) =>
                token.kind === "plain" ? (
                  token.text
                ) : (
                  <Tok key={j} $kind={token.kind}>
                    {token.text}
                  </Tok>
                ),
              )
            : "\n"}
        </Line>
      ))}
    </code>
  );
}

const COLLAPSE_AT = 30;
const COLLAPSED_LINES = 18;

// Only long optional output is ever shortened (`clip` lines, with a control
// that shows the rest). Requests and verification code are always whole.
function Body({ code, language, clip }: { code: string; language: CodeLanguage; clip?: number }) {
  const count = code.split("\n").length;
  const limit = clip ?? COLLAPSED_LINES;
  const long = clip === 0 ? false : count > (clip ? clip + 3 : COLLAPSE_AT);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pre $clip={long && !open ? limit : 0} tabIndex={0}>
        <Lines code={code} language={language} />
      </Pre>
      {long && (
        <More type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <DownOutlined rotate={open ? 180 : 0} />
          {open ? "Collapse" : `Show all ${count} lines`}
        </More>
      )}
    </>
  );
}

// Where a sample came from: copied from a real response, or written from the
// server code because the request cannot complete in the docs environment.
export type Provenance = "captured" | "example";

export interface CodeBlockProps {
  code: string;
  language: CodeLanguage;
  // A title or file name for the header. Defaults to the language.
  title?: ReactNode;
  provenance?: Provenance;
  // An HTTP status to show as a badge.
  status?: number;
  // Shorten to this many lines with a "show all" control; 0 never shortens.
  clip?: number;
  // Extra header content, placed before the copy button.
  actions?: ReactNode;
}

export function CodeBlock({ code, language, title, provenance, status, clip, actions }: CodeBlockProps) {
  return (
    <Frame>
      <Head>
        {status !== undefined && <Status $ok={status < 400}>{status}</Status>}
        <Title>{title ?? language}</Title>
        {provenance && (
          <Origin
            $kind={provenance}
            title={
              provenance === "captured"
                ? "Copied from a real response of this API."
                : "Written from the server code; this request cannot complete in the docs environment."
            }
          >
            {provenance === "captured" ? "Captured" : "Example"}
          </Origin>
        )}
        {actions}
        <CopyButton text={code} />
      </Head>
      <Body code={code} language={language} clip={clip} />
    </Frame>
  );
}

export function JsonBlock({
  value,
  title = "Response",
  ...rest
}: Omit<CodeBlockProps, "code" | "language"> & { value: unknown }) {
  return <CodeBlock code={JSON.stringify(value, null, 2)} language="json" title={title} {...rest} />;
}

// The language picker as a row of pills, each with its mark. Scrolls
// sideways where nine do not fit. Bound to the shared, remembered choice.
export function LanguagePicker({ className }: { className?: string }) {
  const [language, setLanguage] = useSampleLanguage();
  return (
    <Pills role="radiogroup" aria-label="Sample language" className={className}>
      {SAMPLE_LANGUAGES.map((option) => (
        <Pill
          key={option.id}
          type="button"
          role="radio"
          aria-checked={language === option.id}
          $on={language === option.id}
          onClick={() => setLanguage(option.id)}
        >
          <Mark aria-hidden="true">{option.mark}</Mark>
          {option.label}
        </Pill>
      ))}
    </Pills>
  );
}

// The same choice as a compact menu, for a block's header or a narrow bar.
export function LanguageSelect({ className }: { className?: string }) {
  const [language, setLanguage] = useSampleLanguage();
  return (
    <Select
      aria-label="Sample language"
      className={className}
      value={language}
      onChange={(event) => setLanguage(event.target.value as SampleLanguage)}
    >
      {SAMPLE_LANGUAGES.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

// One piece of code in all nine languages, showing the chosen one.
export function SampleBlock({
  samples,
  title,
  picker = true,
}: {
  samples: Samples;
  title: ReactNode;
  // Whether the header carries its own language menu.
  picker?: boolean;
}) {
  const [language] = useSampleLanguage();
  const info = languageInfo(language);
  return (
    <CodeBlock
      // Requests and verification code are never shortened.
      clip={0}
      code={samples[language]}
      language={info.highlight}
      title={title}
      actions={picker ? <LanguageSelect /> : <Current>{info.label}</Current>}
    />
  );
}

// Puts its children on the dark palette whatever the page's mode, so code
// reads as a separate, contrasting surface.
export function CodeSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Surface data-theme="dark" className={className}>
      {children}
    </Surface>
  );
}

const Surface = styled.div`
  color: ${({ theme }) => theme.color.fg};

  & > * + * {
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

// The box never scrolls: its header stays put, and only the code area below
// it scrolls, sideways for long lines and down when the box is given less
// height than the code needs.
const Frame = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};

  & + & {
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

const Head = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-height: ${({ theme }) => theme.space(9)};
  padding: 0 ${({ theme }) => theme.space(1.5)} 0 ${({ theme }) => theme.space(3.5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
`;

const Title = styled.span`
  ${type("caption")}
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 500;
  color: ${({ theme }) => theme.color.fgMuted};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Current = styled.span`
  ${type("caption")}
  flex: none;
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Status = styled.span<{ $ok: boolean }>`
  ${type("caption")}
  flex: none;
  padding: 0 ${({ theme }) => theme.space(1.5)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $ok }) => ($ok ? theme.color.successSoft : theme.color.dangerSoft)};
  font-family: ${({ theme }) => theme.font.mono};
  font-weight: 500;
  color: ${({ theme, $ok }) => ($ok ? theme.color.success : theme.color.danger)};
`;

const Origin = styled.span<{ $kind: Provenance }>`
  ${type("overline")}
  flex: none;
  padding: 0 ${({ theme }) => theme.space(2)};
  border: 1px solid
    ${({ theme, $kind }) => ($kind === "captured" ? theme.color.lineStrong : theme.color.accentSoft)};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme, $kind }) =>
    $kind === "captured" ? theme.color.fgSubtle : theme.color.accentText};
  cursor: help;
`;

const Copy = styled.button<{ $done: boolean }>`
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.space(7)};
  height: ${({ theme }) => theme.space(7)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme, $done }) => ($done ? theme.color.success : theme.color.fgSubtle)};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast},
    background ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme, $done }) => ($done ? theme.color.success : theme.color.fg)};
  }
`;

const Pre = styled.pre<{ $clip: number }>`
  ${type("code")}
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3.5)};
  overflow: ${({ $clip }) => ($clip ? "auto hidden" : "auto")};
  max-height: ${({ theme, $clip }) =>
    $clip ? `calc(${theme.text.code.line} * ${$clip} + ${theme.space(6)})` : "none"};
  color: ${({ theme }) => theme.color.fg};
  tab-size: 2;
  /* Long lines scroll sideways, with a scrollbar that stays visible. */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.lineStrong} transparent;
  mask-image: ${({ theme, $clip }) =>
    $clip ? `linear-gradient(${theme.color.canvas} 70%, transparent)` : "none"};

  code {
    display: block;
    width: max-content;
    min-width: 100%;
    font: inherit;
  }
`;

const Line = styled.span`
  display: block;
  white-space: pre;
`;

const Tok = styled.span<{ $kind: TokenKind }>`
  color: ${({ theme, $kind }) =>
    ({
      plain: theme.color.fg,
      comment: theme.color.fgSubtle,
      string: theme.color.success,
      number: theme.color.accentText,
      keyword: theme.color.violet,
      key: theme.color.info,
      variable: theme.color.pink,
      flag: theme.color.accentTextHover,
    })[$kind]};
  font-style: ${({ $kind }) => ($kind === "comment" ? "italic" : "normal")};
`;

const More = styled.button`
  ${type("caption")}
  display: flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  width: 100%;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3.5)};
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
  color: ${({ theme }) => theme.color.fgMuted};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Pills = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Pill = styled.button<{ $on: boolean }>`
  ${type("caption")}
  display: flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)}
    ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.lineStrong : "transparent")};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $on }) => ($on ? theme.color.surface : "transparent")};
  font-weight: 500;
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Mark = styled.span`
  display: grid;
  place-items: center;
  min-width: ${({ theme }) => theme.space(6)};
  height: ${({ theme }) => theme.space(5)};
  padding-inline: ${({ theme }) => theme.space(1)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.raised};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.text.overline.size};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Select = styled.select`
  ${type("caption")}
  flex: none;
  height: ${({ theme }) => theme.space(7)};
  padding: 0 ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.surface};
  font-weight: 500;
  color: ${({ theme }) => theme.color.fg};
  cursor: pointer;
`;
