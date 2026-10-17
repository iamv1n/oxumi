"use client";

import { ArrowRightOutlined, CheckOutlined, LinkOutlined } from "@ant-design/icons";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { CodeSurface, CopyButton } from "@oxumi/ui/docs/CodeBlock";

// The building blocks every docs page is written with. The rhythm is that of
// a reference: compact type, hairline dividers, and code beside the prose.

// Where content may start: below the site's navigation bar (which publishes
// its height) and the docs toolbar. Set on the docs frame, read everywhere.
export const DOCS_TOP = "var(--docs-top)";

// From this width up, a section is two equal halves: information on the
// left, code on the right. Below it, code follows the text it belongs to.
export const SPLIT = "@media (min-width: 1100px)";

export type Method = "GET" | "POST" | "DELETE";

export const MethodBadge = styled.span<{ $method: Method; $small?: boolean }>`
  ${({ $small }) => type($small ? "overline" : "caption")}
  display: inline-block;
  flex: none;
  min-width: ${({ theme, $small }) => theme.space($small ? 9 : 13)};
  padding: ${({ theme, $small }) => ($small ? 0 : theme.space(0.5))}
    ${({ theme, $small }) => theme.space($small ? 1 : 2)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $method }) =>
    ({ GET: theme.color.infoSoft, POST: theme.color.successSoft, DELETE: theme.color.dangerSoft })[
      $method
    ]};
  font-family: ${({ theme }) => theme.font.mono};
  font-weight: 600;
  letter-spacing: 0;
  text-align: center;
  color: ${({ theme, $method }) =>
    ({ GET: theme.color.info, POST: theme.color.success, DELETE: theme.color.danger })[$method]};
`;

/* ---------- page ---------- */

export const Article = styled.article`
  min-width: 0;

  /* Links in running text. Components with their own look carry a class. */
  a:not([class]) {
    color: ${({ theme }) => theme.color.fg};
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.color.lineStrong};
    text-underline-offset: 3px;
    transition: text-decoration-color ${({ theme }) => theme.motion.fast};
  }
  a:not([class]):hover {
    text-decoration-color: ${({ theme }) => theme.color.accentLine};
  }
`;

const TitleBlock = styled.header`
  padding-bottom: ${({ theme }) => theme.space(5)};
`;

const Kicker = styled.p`
  ${type("overline")}
  color: ${({ theme }) => theme.color.accentText};
`;

const H1 = styled.h1`
  ${type("title")}
  margin-top: ${({ theme }) => theme.space(1.5)};
  font-size: calc(${({ theme }) => theme.text.title.size} * 1.25);
  line-height: calc(${({ theme }) => theme.text.title.line} * 1.2);
  color: ${({ theme }) => theme.color.fg};
  text-wrap: balance;
`;

export const Lead = styled.p`
  ${type("body")}
  max-width: 52rem;
  margin-top: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.text.heading.size};
  line-height: ${({ theme }) => theme.text.heading.line};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

export function PageTitle({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <TitleBlock>
      <Kicker>{kicker}</Kicker>
      <H1>{title}</H1>
      {children && <Lead>{children}</Lead>}
    </TitleBlock>
  );
}

/* ---------- sections and headings ---------- */

const anchored = css`
  scroll-margin-top: calc(${DOCS_TOP} + ${({ theme }) => theme.space(4)});
`;

const HeadingRow = styled.div`
  ${anchored}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};

  &:hover button,
  button:focus-visible {
    opacity: 1;
  }
`;

const H2 = styled.h2`
  ${type("heading")}
  font-size: calc(${({ theme }) => theme.text.heading.size} * 1.12);
  color: ${({ theme }) => theme.color.fg};
`;

const H3 = styled.h3`
  ${type("body")}
  font-weight: 600;
  color: ${({ theme }) => theme.color.fg};
`;

const AnchorButton = styled.button<{ $done: boolean }>`
  ${type("label")}
  flex: none;
  padding: ${({ theme }) => theme.space(1)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme, $done }) => ($done ? theme.color.success : theme.color.fgSubtle)};
  cursor: pointer;
  opacity: ${({ $done }) => ($done ? 1 : 0)};
  transition:
    opacity ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  /* Touch screens have no hover: keep the affordance visible. */
  @media (hover: none) {
    opacity: 1;
  }
`;

// A heading with a deep link. Clicking the link icon puts the section's URL
// in the address bar and on the clipboard.
export function Heading({
  id,
  level = 2,
  children,
}: {
  id: string;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const Tag = level === 2 ? H2 : H3;
  return (
    <HeadingRow id={id} data-spy={level === 2 ? "" : undefined}>
      <Tag>{children}</Tag>
      <AnchorButton
        type="button"
        aria-label="Copy link to this section"
        title={copied ? "Link copied" : "Copy link"}
        $done={copied}
        onClick={() => {
          const url = `${location.origin}${location.pathname}#${id}`;
          history.replaceState(null, "", `#${id}`);
          void navigator.clipboard?.writeText(url).then(() => setCopied(true));
        }}
      >
        {copied ? <CheckOutlined /> : <LinkOutlined />}
      </AnchorButton>
    </HeadingRow>
  );
}

// One section: prose on the left and, beside it, a code column on its own
// dark surface that stays in view while the prose is read. On narrower
// screens the code follows its text. A section with no `aside` spans the full
// width, for tables and card grids.
const SectionGrid = styled.section<{ $split: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding-block: ${({ theme }) => theme.space(6)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  ${SPLIT} {
    grid-template-columns: ${({ $split }) =>
      $split ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)"};
    gap: ${({ theme }) => theme.space(8)};
    min-height: ${({ theme, $split }) => ($split ? theme.space(112) : "0")};
  }
`;

export const Prose = styled.div`
  min-width: 0;

  & > * + * {
    margin-top: ${({ theme }) => theme.space(3)};
  }
`;

// The code half. Its cell takes the height of the prose beside it (never
// less than a comfortable minimum) instead of the height of the code, so a
// long sample cannot leave the prose half empty: the code sticks under the
// bars while its section is read and scrolls on its own when it is taller
// than the room it has.
const RailCell = styled.div`
  min-width: 0;

  ${SPLIT} {
    container-type: size;
  }
`;

const RailBody = styled(CodeSurface)`
  ${SPLIT} {
    position: sticky;
    top: calc(${DOCS_TOP} + ${({ theme }) => theme.space(4)});
    display: flex;
    flex-direction: column;
    max-height: min(calc(100vh - ${DOCS_TOP} - ${({ theme }) => theme.space(8)}), 100cqh);
    /* Normally nothing here scrolls: the boxes below shrink and scroll their
       own code. This is the fallback for a column of things that cannot. */
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.color.lineStrong} transparent;

    & > * {
      flex: 0 1 auto;
      min-height: ${({ theme }) => theme.space(28)};
    }
    & > dl {
      flex: none;
    }
  }
`;

export function Rail({ children }: { children: ReactNode }) {
  return (
    <RailCell>
      <RailBody>{children}</RailBody>
    </RailCell>
  );
}

export function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SectionGrid $split={Boolean(aside)}>
      <Prose>
        <Heading id={id}>{title}</Heading>
        {children}
      </Prose>
      {aside && <Rail>{aside}</Rail>}
    </SectionGrid>
  );
}

/* ---------- prose ---------- */

export const P = styled.p`
  ${type("body")}
  max-width: 46rem;
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
`;

export const C = styled.code`
  ${type("caption")}
  padding: 1px ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.space(1)};
  background: ${({ theme }) => theme.color.raised};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fg};
  overflow-wrap: anywhere;
`;

export const List = styled.ul`
  max-width: 46rem;
  padding-left: ${({ theme }) => theme.space(4.5)};
  list-style: disc;

  li {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  li + li {
    margin-top: ${({ theme }) => theme.space(1.5)};
  }
  li::marker {
    color: ${({ theme }) => theme.color.fgFaint};
  }
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
`;

// A numbered list of short steps.
export const Steps = styled.ol`
  counter-reset: step;

  & > li {
    ${type("body")}
    position: relative;
    padding: ${({ theme }) => theme.space(2.5)} 0 ${({ theme }) => theme.space(2.5)}
      ${({ theme }) => theme.space(9)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
    counter-increment: step;
  }
  & > li::before {
    ${type("caption")}
    content: counter(step);
    position: absolute;
    top: ${({ theme }) => theme.space(2.5)};
    left: 0;
    display: grid;
    place-items: center;
    width: ${({ theme }) => theme.space(6)};
    height: ${({ theme }) => theme.space(6)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accentSoft};
    font-family: ${({ theme }) => theme.font.mono};
    font-weight: 600;
    color: ${({ theme }) => theme.color.accentText};
  }
  strong {
    display: block;
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const NoteBox = styled.div<{ $tone: "note" | "warning" }>`
  max-width: 46rem;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  border-left: 2px solid
    ${({ theme, $tone }) => ($tone === "warning" ? theme.color.warning : theme.color.info)};
  border-radius: 0 ${({ theme }) => theme.radius.control} ${({ theme }) => theme.radius.control} 0;
  background: ${({ theme, $tone }) =>
    $tone === "warning" ? theme.color.warningSoft : theme.color.infoSoft};

  p {
    ${type("body")}
    color: ${({ theme }) => theme.color.fg};
  }
  p + p {
    margin-top: ${({ theme }) => theme.space(1.5)};
  }
`;

const NoteTitle = styled.p`
  && {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// The docs' two callouts: a Note for something worth knowing, a Warning for
// something that will bite.
export function Note({
  title,
  tone = "note",
  children,
}: {
  title: string;
  tone?: "note" | "warning";
  children: ReactNode;
}) {
  return (
    <NoteBox $tone={tone} role="note">
      <NoteTitle>
        {tone === "warning" ? "Warning" : "Note"} · {title}
      </NoteTitle>
      {children}
    </NoteBox>
  );
}

/* ---------- tables ---------- */

const TableScroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
`;

const TableEl = styled.table`
  ${type("body")}
  width: 100%;
  border-collapse: collapse;

  th {
    ${type("overline")}
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fgSubtle};
    text-align: left;
    white-space: nowrap;
  }
  td {
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
    vertical-align: top;
  }
  td:first-child {
    color: ${({ theme }) => theme.color.fg};
    white-space: nowrap;
  }
`;

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <TableScroll>
      <TableEl>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableEl>
    </TableScroll>
  );
}

/* ---------- fields (parameters and object attributes) ---------- */

export interface FieldDoc {
  name: string;
  type: string;
  required?: boolean;
  // Shown instead of required/optional, e.g. "List only".
  tag?: string;
  description: ReactNode;
}

const FieldList = styled.dl`
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

// One tight row per field: name, type and requirement on the left, the
// description on the right.
const FieldRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
  padding-block: ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: ${({ theme }) => theme.space(46)} minmax(0, 1fr);
  }
  dt {
    min-width: 0;
  }
  dd {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const FieldName = styled.span`
  ${type("code")}
  display: block;
  font-weight: 600;
  color: ${({ theme }) => theme.color.fg};
  overflow-wrap: anywhere;
`;

const FieldMeta = styled.span`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgSubtle};

  b {
    font-family: ${({ theme }) => theme.font.sans};
    font-weight: 600;
    color: ${({ theme }) => theme.color.accentText};
  }
  i {
    font-family: ${({ theme }) => theme.font.sans};
    font-style: normal;
  }
`;

export function Fields({ items, mode = "params" }: { items: FieldDoc[]; mode?: "params" | "object" }) {
  return (
    <FieldList>
      {items.map((item) => (
        <FieldRow key={item.name}>
          <dt>
            <FieldName>{item.name}</FieldName>
            <FieldMeta>
              {item.type}
              {item.tag ? (
                <i> · {item.tag}</i>
              ) : (
                mode === "params" && (item.required ? <b> · required</b> : <i> · optional</i>)
              )}
            </FieldMeta>
          </dt>
          <dd>{item.description}</dd>
        </FieldRow>
      ))}
    </FieldList>
  );
}

export const SubHeading = styled.h4`
  ${type("overline")}
  margin-top: ${({ theme }) => theme.space(5)};
  margin-bottom: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

/* ---------- facts, glance boxes and cards ---------- */

const FactsBox = styled.dl`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
`;

const FactsTitle = styled.p`
  ${type("caption")}
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3.5)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.raised};
  font-weight: 500;
  color: ${({ theme }) => theme.color.fgMuted};
`;

const FactRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3.5)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  dt {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  dd {
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// A small table for the code column: values to look up while reading.
export function Facts({ title, rows }: { title: string; rows: [ReactNode, ReactNode][] }) {
  return (
    <FactsBox>
      <FactsTitle as="div">{title}</FactsTitle>
      {rows.map(([term, detail], i) => (
        <FactRow key={i}>
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </FactRow>
      ))}
    </FactsBox>
  );
}

const GlanceGrid = styled.div`
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.line};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const GlanceCell = styled.div`
  min-width: 0;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(1.5)}
    ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  background: ${({ theme }) => theme.color.surface};

  p {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  div {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
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
  small {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// The values a developer comes back for, each one click from the clipboard.
export function Glance({
  items,
}: {
  items: { label: string; value: string; note: ReactNode; copy?: string }[];
}) {
  return (
    <GlanceGrid>
      {items.map((item) => (
        <GlanceCell key={item.label}>
          <p>{item.label}</p>
          <div>
            <code title={item.value}>{item.value}</code>
            <CopyButton text={item.copy ?? item.value} label={`Copy ${item.label.toLowerCase()}`} />
          </div>
          <small>{item.note}</small>
        </GlanceCell>
      ))}
    </GlanceGrid>
  );
}

const CardGrid = styled.div<{ $columns: number }>`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  }
`;

const CardLink = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  transition: border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.lineStrong};
  }
  b {
    ${type("label")}
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  b .anticon {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  span {
    ${type("label")}
    display: block;
    margin-top: ${({ theme }) => theme.space(0.5)};
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const CardBox = styled.div`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};

  b {
    ${type("label")}
    display: block;
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  span {
    ${type("label")}
    display: block;
    margin-top: ${({ theme }) => theme.space(0.5)};
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// A grid of short cards. With an href a card is a link to another page.
export function Cards({
  items,
  columns = 3,
}: {
  items: { title: string; text: ReactNode; href?: string }[];
  columns?: number;
}) {
  return (
    <CardGrid $columns={columns}>
      {items.map((item) =>
        item.href ? (
          <CardLink key={item.title} href={item.href} className="card">
            <b>
              {item.title} <ArrowRightOutlined />
            </b>
            <span>{item.text}</span>
          </CardLink>
        ) : (
          <CardBox key={item.title}>
            <b>{item.title}</b>
            <span>{item.text}</span>
          </CardBox>
        ),
      )}
    </CardGrid>
  );
}
