"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { CopyButton } from "@oxumi/ui/docs/CodeBlock";
import {
  type FieldDoc,
  Fields,
  Heading,
  type Method,
  MethodBadge,
  Rail,
  SPLIT,
  SubHeading,
} from "./ui";

// One reference entry. Every endpoint has the same rhythm: title, method and
// path, one paragraph, parameters, returns, errors; with its request and
// response in the code column beside it.

export interface ErrorDoc {
  status: number;
  when: ReactNode;
}

export function Endpoint({
  id,
  title,
  method,
  path,
  children,
  pathParams,
  query,
  body,
  returns,
  errors,
  aside,
}: {
  id: string;
  title: string;
  method: Method;
  path: string;
  children: ReactNode;
  pathParams?: FieldDoc[];
  query?: FieldDoc[];
  body?: FieldDoc[];
  returns: ReactNode;
  errors?: ErrorDoc[];
  aside: ReactNode;
}) {
  return (
    <Entry>
      <Left>
        <Heading id={id}>{title}</Heading>
        <Route>
          <MethodBadge $method={method}>{method}</MethodBadge>
          <code>{path}</code>
          <CopyButton text={path} label="Copy path" />
        </Route>
        <Text>{children}</Text>

        {pathParams && (
          <>
            <SubHeading>Path parameters</SubHeading>
            <Fields items={pathParams} />
          </>
        )}
        {query && (
          <>
            <SubHeading>Query parameters</SubHeading>
            <Fields items={query} />
          </>
        )}
        {body && (
          <>
            <SubHeading>Body</SubHeading>
            <Fields items={body} />
          </>
        )}

        <SubHeading>Returns</SubHeading>
        <Text>{returns}</Text>

        <SubHeading>Errors</SubHeading>
        <ErrorList>
          {(errors ?? []).map((error, i) => (
            <li key={i}>
              <b>{error.status}</b>
              <span>{error.when}</span>
            </li>
          ))}
          <li>
            <b>401 · 429</b>
            <span>
              As for every endpoint: see <Link href="/docs/authentication#sending">Authentication</Link>{" "}
              and <Link href="/docs/rate-limits">Rate limits</Link>.
            </span>
          </li>
        </ErrorList>
      </Left>
      <Rail>{aside}</Rail>
    </Entry>
  );
}

// An object's attributes, in the same layout.
export function ObjectDoc({
  id,
  title,
  children,
  fields,
  aside,
}: {
  id: string;
  title: string;
  children: ReactNode;
  fields: FieldDoc[];
  aside: ReactNode;
}) {
  return (
    <Entry>
      <Left>
        <Heading id={id}>{title}</Heading>
        <Text>{children}</Text>
        <SubHeading>Attributes</SubHeading>
        <Fields items={fields} mode="object" />
      </Left>
      <Rail>{aside}</Rail>
    </Entry>
  );
}

export const GroupTitle = styled.p`
  ${type("overline")}
  padding-top: ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.accentText};

  & + section {
    border-top: 0;
    padding-top: ${({ theme }) => theme.space(3)};
  }
`;

const Entry = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding-block: ${({ theme }) => theme.space(6)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  ${SPLIT} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(8)};
    min-height: ${({ theme }) => theme.space(112)};
  }
`;

const Left = styled.div`
  min-width: 0;
`;

const Route = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  margin-top: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(1)}
    ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(1.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.surface};

  code {
    ${type("code")}
    flex: 1;
    min-width: 0;
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
`;

const Text = styled.div`
  ${type("body")}
  max-width: 46rem;
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;

  h4 + & {
    margin-top: 0;
  }
  p + p,
  p + div,
  div + p {
    margin-top: ${({ theme }) => theme.space(2.5)};
  }
`;

const ErrorList = styled.ul`
  border-top: 1px solid ${({ theme }) => theme.color.line};

  li {
    ${type("body")}
    display: grid;
    grid-template-columns: ${({ theme }) => theme.space(20)} minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(3)};
    padding-block: ${({ theme }) => theme.space(2)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  b {
    ${type("code")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.danger};
  }
`;

const IndexTable = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
`;

const IndexRow = styled(Link)`
  ${type("body")}
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space(15)} minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.fgMuted};
  transition: background ${({ theme }) => theme.motion.fast};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  &:hover {
    background: ${({ theme }) => theme.color.raised};
  }
  code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  span:last-child {
    grid-column: 2;
  }
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: ${({ theme }) => theme.space(15)} minmax(0, 5fr) minmax(0, 6fr);

    span:last-child {
      grid-column: auto;
    }
  }
`;

// Every endpoint on one screen: method, path, purpose, each linking down.
export function EndpointIndex({
  rows,
}: {
  rows: { id: string; method: Method; path: string; purpose: string }[];
}) {
  return (
    <IndexTable>
      {rows.map((row) => (
        <IndexRow key={row.id} href={`#${row.id}`} className="row">
          <MethodBadge $method={row.method}>{row.method}</MethodBadge>
          <code>{row.path}</code>
          <span>{row.purpose}</span>
        </IndexRow>
      ))}
    </IndexTable>
  );
}
