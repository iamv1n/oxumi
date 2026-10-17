"use client";

import { useMemo } from "react";
import styled from "styled-components";
import { CodeBlock, CopyButton } from "@oxumi/ui/docs/CodeBlock";
import {
  languageInfo,
  SAMPLE_LANGUAGES,
  type SampleLanguage,
  useSampleLanguage,
} from "@oxumi/ui/docs/languages";
import { KEY_PLACEHOLDER, requestSamples } from "@oxumi/ui/docs/request";
import { type } from "@oxumi/ui/design/typography";
import { API_URL } from "@/lib/api";
import type { CodeBlockSpec, CodeView } from "./codeViews";

// The page's code panel: always the code for what is on the left, in the
// language chosen once for the whole product (the docs use the same choice).
// It is pinned to the dark palette in both colour modes, like a terminal.

export const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/v1`;

const Panel = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${({ theme }) => theme.color.canvas};
  color: ${({ theme }) => theme.color.fg};
`;

const Top = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => theme.color.canvas};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: ${({ theme }) => theme.space(9)};
  padding: 0 ${({ theme }) => theme.space(4)};

  .label {
    ${type("overline")}
    margin-right: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .where {
    margin-right: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.accentText};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Languages = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ theme }) => theme.space(18)}, 1fr));
  gap: 2px;
  padding: 0 ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(2)};
`;

const Language = styled.button<{ $on: boolean }>`
  ${type("caption")}
  height: ${({ theme }) => theme.space(6)};
  padding: 0 ${({ theme }) => theme.space(2.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme, $on }) => ($on ? theme.color.overlay : "transparent")};
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Base = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-height: ${({ theme }) => theme.space(9)};
  padding: 0 ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  code {
    ${type("code")}
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fg};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Body = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.space(4)};

  .eyebrow {
    ${type("overline")}
    color: ${({ theme }) => theme.color.accentText};
  }
  h2 {
    ${type("heading")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fg};
  }
  .intro {
    ${type("label")}
    margin: ${({ theme }) => theme.space(1)} 0 ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
    font-weight: 400;
  }
  .note {
    ${type("caption")}
    margin: ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .block + .block {
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

function Block({
  block,
  language,
  keyHint,
}: {
  block: CodeBlockSpec;
  language: SampleLanguage;
  keyHint?: string;
}) {
  const info = languageInfo(language);
  const samples = useMemo(
    () =>
      block.kind === "request"
        ? requestSamples(block.spec, { apiKey: keyHint ?? KEY_PLACEHOLDER })
        : block.kind === "samples"
          ? block.samples
          : null,
    [block, keyHint],
  );
  if ((block.kind === "request" || block.kind === "samples") && samples)
    return (
      <CodeBlock
        code={samples[language]}
        language={info.highlight}
        title={`${block.title} · ${info.label}`}
        clip={block.kind === "samples" ? 24 : undefined}
      />
    );
  if (block.kind === "server") {
    const python = language === "python";
    return (
      <>
        <CodeBlock
          code={python ? block.python : block.node}
          language={python ? "python" : "javascript"}
          title={`${block.title} · ${python ? "Python" : "JavaScript"}`}
          clip={22}
        />
        {!python && language !== "javascript" && (
          <p className="note">
            This sample exists in JavaScript and Python only; showing JavaScript.
          </p>
        )}
      </>
    );
  }
  if (block.kind === "json")
    return (
      <CodeBlock
        code={JSON.stringify(block.value, null, 2)}
        language="json"
        title={block.title}
        status={block.status}
        clip={18}
      />
    );
  if (block.kind === "http")
    return <CodeBlock code={block.code} language="http" title={block.title} />;
  return null;
}

export function CodePanel({ view }: { view: CodeView }) {
  const [language, setLanguage] = useSampleLanguage();

  return (
    // The nested data-theme re-scopes the colour variables (see GlobalStyle).
    <Panel data-theme="dark" data-tour="api-code" aria-label="Code for this view">
      <Top>
        <Bar>
          <span className="label">Code</span>
          <span className="label where">{view.eyebrow}</span>
        </Bar>
        <Languages role="radiogroup" aria-label="Code language">
          {SAMPLE_LANGUAGES.map((option) => (
            <Language
              key={option.id}
              type="button"
              role="radio"
              aria-checked={language === option.id}
              $on={language === option.id}
              onClick={() => setLanguage(option.id)}
            >
              {option.label}
            </Language>
          ))}
        </Languages>
        <Base>
          <span>Base URL</span>
          <code>{API_BASE_URL}</code>
          <CopyButton text={API_BASE_URL} label="Copy the base URL" />
        </Base>
      </Top>
      <Body>
        {/* Announced when the code changes; the code itself is not read out. */}
        <div aria-live="polite">
          <h2>{view.title}</h2>
        </div>
        <p className="intro">{view.intro}</p>
        {view.blocks.map((block, i) => (
          <div className="block" key={`${view.title}:${i}:${block.title}`}>
            <Block block={block} language={language} keyHint={view.keyHint} />
          </div>
        ))}
      </Body>
    </Panel>
  );
}
