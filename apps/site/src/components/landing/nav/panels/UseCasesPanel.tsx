"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import { usePathname } from "next/navigation";
import { type CSSProperties, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { useExampleLanguage } from "../../language";
import { SCENARIO_ITEMS, USE_CASE_ITEMS } from "../data";
import { Column, Grid, Inset, InsetHead, Marker, Minor, type PanelProps, Row, Title } from "./parts";

const Layout = styled(Grid)`
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1.25fr);
  align-items: start;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const Foot = styled.div`
  margin-top: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(2)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

// The opening line of the call, as the agent says it.
const Line = styled.p<{ $hindi: boolean }>`
  ${type("body")}
  display: -webkit-box;
  min-height: calc(${({ theme }) => theme.text.body.line} * 3);
  margin: ${({ theme }) => theme.space(3)};
  overflow: hidden;
  color: ${({ theme }) => theme.color.fg};
  font-family: ${({ theme, $hindi }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;

  /* The agent's side of the line, in the use case's colour. */
  padding-left: ${({ theme }) => theme.space(3)};
  border-left: 2px solid var(--tone);
`;

const Returns = styled.dl`
  display: grid;
  min-height: ${({ theme }) => theme.space(31)};
  align-content: start;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(3)};
    padding-block: ${({ theme }) => theme.space(1)};
  }
  dt {
    ${type("caption")}
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  dd {
    flex: none;
    color: ${({ theme }) => theme.color.fg};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 12px;
    line-height: 16px;
  }
`;

// Use cases: the four with their own pages, the eight in the picker, and a
// preview of the one being pointed at, spoken in the visitor's chosen
// language with the fields it returns.
export default function UseCasesPanel({ onNavigate }: PanelProps) {
  const pathname = usePathname();
  const { language } = useExampleLanguage();
  const [pointed, setPointed] = useState<string | null>(null);

  const previews = [
    ...USE_CASE_ITEMS.map(({ href, useCase }) => ({
      key: href,
      tone: useCase.tone,
      head: useCase.call,
      line: useCase.turns[0]![1],
      fields: useCase.fields.map(([name, example]) => [name, example] as const),
    })),
    ...SCENARIO_ITEMS.map(({ scenario }) => ({
      key: scenario.label,
      tone: scenario.tone,
      head: scenario.who,
      line: scenario.opening,
      fields: scenario.fields.map((name) => [name, null] as const),
    })),
  ];
  // Nothing pointed at: the use case whose page this is, or the first.
  const preview =
    previews.find((item) => item.key === pointed) ??
    previews.find((item) => item.key === pathname) ??
    previews[0]!;

  const point = (key: string) => ({
    onPointerEnter: () => setPointed(key),
    onFocus: () => setPointed(key),
  });

  return (
    <Layout>
      <Column>
        <Title>By team</Title>
        {USE_CASE_ITEMS.map(({ href, title, note, useCase }) => (
          <Row
            key={href}
            href={href}
            style={{ "--tone": useCase.tone } as CSSProperties}
            data-on={preview.key === href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={onNavigate}
            {...point(href)}
          >
            <Marker />
            <strong>{title}</strong>
            <small>{note}</small>
          </Row>
        ))}
      </Column>
      <Column>
        <Title>Also a good fit</Title>
        <Pair>
          {SCENARIO_ITEMS.map(({ href, title }) => (
            <Minor key={title} href={href} onClick={onNavigate} {...point(title)}>
              {title}
            </Minor>
          ))}
        </Pair>
        <Foot>
          <Minor href="/use-cases" onClick={onNavigate}>
            All use cases <ArrowRightOutlined />
          </Minor>
        </Foot>
      </Column>
      <Inset aria-hidden style={{ "--tone": preview.tone } as CSSProperties}>
        <InsetHead>
          <b>{preview.head}</b>
          <span>agent opens</span>
        </InsetHead>
        <Line $hindi={language === "hi"}>{preview.line[language]}</Line>
        <Returns>
          {preview.fields.map(([name, example]) => (
            <div key={name}>
              <dt>{name}</dt>
              {example && <dd>{example}</dd>}
            </div>
          ))}
        </Returns>
      </Inset>
    </Layout>
  );
}
