"use client";

import { type ReactNode, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { CopyButton } from "@oxumi/ui/docs/CodeBlock";

// A JSON document you can read field by field: point at (or tab to) a key to
// see what it means; click to keep it selected.

export type Notes = Record<string, { type: string; text: ReactNode }>;

interface Row {
  path: string;
  depth: number;
  key?: string;
  open?: "{" | "[";
  close?: "}" | "]";
  value?: string;
  kind?: "string" | "number" | "keyword";
  comma: boolean;
}

function rows(value: unknown, path: string, depth: number, key: string | undefined, comma: boolean): Row[] {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    const array = Array.isArray(value);
    const entries: [string | undefined, unknown][] = array
      ? (value as unknown[]).map((v) => [undefined, v])
      : Object.entries(value as object);
    if (!entries.length)
      return [{ path, depth, key, value: array ? "[]" : "{}", comma }];
    return [
      { path, depth, key, open: array ? "[" : "{", comma: false },
      ...entries.flatMap(([k, v], i) =>
        rows(
          v,
          // Array items share their parent's notes: "turns[].agent".
          array ? `${path}[]` : path ? `${path}.${k}` : k!,
          depth + 1,
          k,
          i < entries.length - 1,
        ),
      ),
      { path, depth, close: array ? "]" : "}", comma },
    ];
  }
  return [
    {
      path,
      depth,
      key,
      value: JSON.stringify(value),
      kind: typeof value === "string" ? "string" : typeof value === "number" ? "number" : "keyword",
      comma,
    },
  ];
}

export default function JsonExplorer({
  value,
  notes,
  title,
  intro,
}: {
  value: unknown;
  notes: Notes;
  title: string;
  intro: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const shown = hovered ?? pinned;
  const note = shown ? notes[shown] : undefined;
  const all = rows(value, "", 0, undefined, false);

  return (
    <Frame>
      <Head>
        <Title>{title}</Title>
        <Origin>Example</Origin>
        <CopyButton text={JSON.stringify(value, null, 2)} />
      </Head>
      <Pre onMouseLeave={() => setHovered(null)}>
        {all.map((row, i) => {
          const described = row.key !== undefined && notes[row.path] !== undefined;
          return (
            <Line
              key={i}
              $on={described && shown === row.path}
              $pinned={described && pinned === row.path}
              onMouseEnter={() => setHovered(described ? row.path : null)}
            >
              {"  ".repeat(row.depth)}
              {row.key !== undefined &&
                (described ? (
                  <Key
                    type="button"
                    aria-pressed={pinned === row.path}
                    aria-label={`${row.path}: show description`}
                    onFocus={() => setHovered(row.path)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setPinned(pinned === row.path ? null : row.path)}
                  >
                    &quot;{row.key}&quot;
                  </Key>
                ) : (
                  <PlainKey>&quot;{row.key}&quot;</PlainKey>
                ))}
              {row.key !== undefined && ": "}
              {row.open ?? row.close}
              {row.value !== undefined && <Value $kind={row.kind}>{row.value}</Value>}
              {row.comma && ","}
            </Line>
          );
        })}
      </Pre>
      <Panel aria-live="polite">
        {note && shown ? (
          <>
            <PanelHead>
              <b>{shown}</b>
              <span>{note.type}</span>
            </PanelHead>
            <PanelText>{note.text}</PanelText>
          </>
        ) : (
          <PanelText>{intro}</PanelText>
        )}
      </Panel>
    </Frame>
  );
}

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
`;

const Head = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  min-height: ${({ theme }) => theme.space(10)};
  padding: 0 ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
`;

const Title = styled.span`
  ${type("caption")}
  flex: 1;
  font-weight: 500;
  color: ${({ theme }) => theme.color.fgMuted};
`;

const Origin = styled.span`
  ${type("overline")}
  padding: 0 ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.accentSoft};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.accentText};
`;

const Pre = styled.div`
  ${type("code")}
  flex: 1 1 auto;
  min-height: 0;
  max-height: ${({ theme }) => theme.space(100)};
  padding-block: ${({ theme }) => theme.space(3)};
  overflow: auto;
  color: ${({ theme }) => theme.color.fgMuted};
  scrollbar-width: thin;
`;

const Line = styled.div<{ $on: boolean; $pinned: boolean }>`
  width: max-content;
  min-width: 100%;
  padding-inline: ${({ theme }) => theme.space(4)};
  border-left: 2px solid
    ${({ theme, $on, $pinned }) =>
      $pinned ? theme.color.accentLine : $on ? theme.color.lineStrong : "transparent"};
  background: ${({ theme, $on }) => ($on ? theme.color.hover : "transparent")};
  white-space: pre;
`;

const Key = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: ${({ theme }) => theme.color.info};
  text-decoration: underline dotted ${({ theme }) => theme.color.fgFaint};
  text-underline-offset: 4px;
  cursor: pointer;

  &:focus-visible {
    outline: 1px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: 2px;
    box-shadow: none;
  }
`;

const PlainKey = styled.span`
  color: ${({ theme }) => theme.color.info};
`;

const Value = styled.span<{ $kind?: "string" | "number" | "keyword" }>`
  color: ${({ theme, $kind }) =>
    $kind === "string"
      ? theme.color.node.start
      : $kind === "number"
        ? theme.color.accentText
        : $kind === "keyword"
          ? theme.color.violet
          : "inherit"};
`;

const Panel = styled.div`
  flex: none;
  min-height: ${({ theme }) => theme.space(21)};
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
`;

const PanelHead = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2.5)};
  margin-bottom: ${({ theme }) => theme.space(1.5)};

  b {
    ${type("code")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  span {
    ${type("caption")}
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const PanelText = styled.p`
  ${type("body")}
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;
