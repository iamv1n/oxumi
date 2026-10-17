"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Container, Eyebrow, Heading, Lede } from "./kit";

// ---- Page structure --------------------------------------------------------

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(6)};
  margin-bottom: ${({ theme }) => theme.space(10)};

  ${({ theme }) => theme.media.md} {
    margin-bottom: ${({ theme }) => theme.space(14)};
  }
`;

const More = styled(Link)`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-bottom: ${({ theme }) => theme.space(1)};
  border-bottom: 1px solid ${({ theme }) => theme.color.lineStrong};
  color: ${({ theme }) => theme.color.fg};
  transition: border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.accentLine};
  }
  &::after {
    content: "→";
    transition: transform ${({ theme }) => theme.motion.fast};
  }
  &:hover::after {
    transform: translateX(3px);
  }
`;

// A text link to a deeper page: "See all use cases →".
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return <More href={href}>{children}</More>;
}

// The standard opening of every section: eyebrow, heading, an optional single
// sentence, and an optional link to the page that goes deeper. Sections state
// their idea here once and let the visual below do the rest.
export function SectionHeader({
  eyebrow,
  title,
  lede,
  more,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  more?: { href: string; label: string };
}) {
  return (
    <SectionHead>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading>{title}</Heading>
        {lede && <Lede>{lede}</Lede>}
      </div>
      {more && <MoreLink href={more.href}>{more.label}</MoreLink>}
    </SectionHead>
  );
}

const Intro = styled.header`
  padding: ${({ theme }) => theme.space(40)} ${({ theme }) => theme.layout.gutter}
    ${({ theme }) => theme.space(8)};

  h1 {
    ${type("hero")}
    font-size: clamp(2.75rem, 7vw, 5rem);
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
`;

// The opening of a secondary page (Product, Use cases): the page's only h1.
export function PageIntro({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <Intro>
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <Lede>{lede}</Lede>
      </Container>
    </Intro>
  );
}
