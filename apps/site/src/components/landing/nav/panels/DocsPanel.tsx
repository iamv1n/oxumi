"use client";

import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { DOCS } from "../data";
import { focusRing } from "../styles";
import { Column, Grid, MethodTag, Minor, Numeral, type PanelProps, Row, Title } from "./parts";

const Layout = styled(Grid)`
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1.3fr);
  align-items: start;
`;

const Endpoint = styled(Link)`
  ${focusRing}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(1.25)} ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Find = styled.button`
  ${type("label")}
  ${focusRing}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  width: 100%;
  margin-top: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: transparent;
  color: ${({ theme }) => theme.color.fgSubtle};
  text-align: left;
  cursor: pointer;
  transition:
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  kbd {
    margin-left: auto;
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 11px;
  }
  &:hover {
    border-color: ${({ theme }) => theme.color.lineStrong};
    color: ${({ theme }) => theme.color.fg};
  }
`;

// Docs: the four pages that get a first call made, the guides, and every
// endpoint by method and path.
export default function DocsPanel({
  onNavigate,
  onSearch,
  shortcut,
}: PanelProps & { onSearch: () => void; shortcut: string }) {
  const pathname = usePathname();
  return (
    <Layout>
      <Column>
        <Title>Get started</Title>
        {DOCS.start.map((page, order) => (
          <Row
            key={page.href}
            href={page.href}
            aria-current={pathname === page.href ? "page" : undefined}
            onClick={onNavigate}
          >
            <Numeral>0{order + 1}</Numeral>
            <strong>{page.title}</strong>
            <small>{page.note}</small>
          </Row>
        ))}
      </Column>
      <Column>
        <Title>Guides</Title>
        {DOCS.guides.map((page) => (
          <Minor key={page.href} href={page.href} onClick={onNavigate}>
            {page.title}
          </Minor>
        ))}
        <Find type="button" onClick={onSearch}>
          <SearchOutlined aria-hidden />
          Find anything
          <kbd>{shortcut}</kbd>
        </Find>
      </Column>
      <Column>
        <Title>Endpoints</Title>
        {DOCS.endpoints.map((endpoint) => (
          <Endpoint
            key={endpoint.href}
            href={endpoint.href}
            aria-label={`${endpoint.title}: ${endpoint.method} ${endpoint.path}`}
            onClick={onNavigate}
          >
            <MethodTag $method={endpoint.method}>{endpoint.method}</MethodTag>
            <span>{endpoint.path}</span>
          </Endpoint>
        ))}
      </Column>
    </Layout>
  );
}
