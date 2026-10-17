"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { ThemeToggle } from "@oxumi/ui/theme/ThemeSwitch";
import { routes } from "@/lib/routes";
import { Lockup } from "@oxumi/ui/brand";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.layout.topbar};
  padding-inline: ${({ theme }) => theme.space(6)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: color-mix(in srgb, ${({ theme }) => theme.color.canvas} 80%, transparent);
  backdrop-filter: blur(14px);

  nav {
    display: flex;
    gap: ${({ theme }) => theme.space(5)};
    margin-left: auto;
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  nav a:hover,
  nav a[aria-current="page"] {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("heading")}
`;

const Shell = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(12)};
  max-width: 1040px;
  margin-inline: auto;
  padding: ${({ theme }) => theme.space(14)} ${({ theme }) => theme.space(6)}
    ${({ theme }) => theme.space(24)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: 220px minmax(0, 1fr);
  }
`;

const Contents = styled.nav`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: block;
    position: sticky;
    top: calc(${({ theme }) => theme.layout.topbar} + ${({ theme }) => theme.space(10)});
    align-self: start;
  }

  p {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  a {
    display: block;
    padding-block: ${({ theme }) => theme.space(1.5)};
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  a:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Article = styled.article`
  max-width: 44rem;

  h1 {
    ${type("display")}
    color: ${({ theme }) => theme.color.fg};
  }
  .updated {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .intro {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(8)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  section {
    margin-top: ${({ theme }) => theme.space(12)};
    scroll-margin-top: calc(${({ theme }) => theme.layout.topbar} + ${({ theme }) => theme.space(8)});
  }
  h2 {
    ${type("title")}
    font-size: 1.25rem;
    color: ${({ theme }) => theme.color.fg};
  }
  section p,
  section li {
    ${type("body")}
    font-size: 0.9375rem;
    line-height: 1.625rem;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  section p,
  section ul {
    margin-top: ${({ theme }) => theme.space(4)};
  }
  section ul {
    display: grid;
    gap: ${({ theme }) => theme.space(2)};
    padding-left: ${({ theme }) => theme.space(5)};
    list-style: disc;
  }
  section strong {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
  section a {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Draft = styled.aside`
  ${type("body")}
  margin-top: ${({ theme }) => theme.space(8)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  border: 1px solid ${({ theme }) => theme.color.warning};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.warningSoft};
  color: ${({ theme }) => theme.color.fg};

  strong {
    color: ${({ theme }) => theme.color.warning};
  }
`;

// Marks text that must be filled in before launch.
export const Blank = styled.mark`
  padding: 0 ${({ theme }) => theme.space(1)};
  border-radius: 4px;
  background: ${({ theme }) => theme.color.warningSoft};
  color: ${({ theme }) => theme.color.warning};
`;

export default function LegalPage({
  current,
  title,
  updated,
  intro,
  sections,
}: {
  current: "terms" | "privacy";
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <Bar>
        <Brand href={routes.home} aria-label="Oxumi home">
          <Lockup size={28} decorative />
        </Brand>
        <nav aria-label="Legal">
          <Link href={routes.terms} aria-current={current === "terms" ? "page" : undefined}>
            Terms
          </Link>
          <Link href={routes.privacy} aria-current={current === "privacy" ? "page" : undefined}>
            Privacy
          </Link>
          <Link href={routes.login}>Sign in</Link>
        </nav>
        <ThemeToggle />
      </Bar>
      <Shell>
        <Contents aria-label="On this page">
          <p>On this page</p>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </Contents>
        <Article>
          <h1>{title}</h1>
          <p className="updated">Last updated {updated}</p>
          <Draft role="note">
            <strong>Draft.</strong> This document describes how the product works
            today, but it has not been reviewed by a lawyer. The highlighted
            company details, governing law and contact address must be completed
            and the text reviewed before Oxumi is offered to customers.
          </Draft>
          <p className="intro">{intro}</p>
          {sections.map((section, i) => (
            <section key={section.id} id={section.id}>
              <h2>
                {i + 1}. {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </Article>
      </Shell>
    </>
  );
}
