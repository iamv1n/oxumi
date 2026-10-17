"use client";

import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { ThemeLabButton } from "@oxumi/ui/theme/ThemeLab";
import { ThemeSegment } from "@oxumi/ui/theme/ThemeSwitch";
import { type } from "@oxumi/ui/design/typography";
import { Lockup, Wordmark as BrandWordmark } from "@oxumi/ui/brand";
import { INTERNAL_PAGES } from "@oxumi/ui/design/theme-shared";
import { Container } from "../kit";
import { LanguageSwitch } from "../language";
import { mix } from "./shared";
import { routes } from "@/lib/routes";

// Site-wide footer for the marketing pages: brand, link columns, the example
// language control, a status bar, and the wordmark setting behind the bottom
// edge. Every link points at a page that exists.

const COLUMNS: { title: string; links: [href: string, label: string][] }[] = [
  {
    title: "Product",
    links: [
      ["/product", "Product overview"],
      ["/#how", "How it works"],
      ["/use-cases", "Use cases"],
      ["/docs", "API docs"],
    ],
  },
  {
    title: "Use cases",
    links: [
      ["/use-cases/clinics", "Clinics"],
      ["/use-cases/fleets", "Fleets"],
      ["/use-cases/real-estate", "Real estate"],
      ["/use-cases/support", "Support desks"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ...(INTERNAL_PAGES ? ([["/brand", "Brand"]] as [string, string][]) : []),
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
    ],
  },
  {
    title: "Account",
    links: [
      [routes.login, "Sign in"],
      [routes.signup, "Get started"],
    ],
  },
];

const slide = keyframes`
  to { background-position: -200% 0; }
`;
const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--ring); }
  50% { box-shadow: 0 0 0 5px transparent; }
`;

const Bar = styled.footer`
  position: relative;
  overflow: clip;
  padding: ${({ theme }) => theme.space(14)} ${({ theme }) => theme.layout.gutter} 0;

`;

// A hairline in the brand gradient that drifts slowly, in place of a border.
const Hairline = styled.span`
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
      90deg,
      ${({ theme }) => theme.color.accent},
      ${({ theme }) => theme.color.pink},
      ${({ theme }) => theme.color.violet},
      ${({ theme }) => theme.color.accent}
    )
    0 0 / 200% 100%;
  mask-image: linear-gradient(
    90deg,
    transparent,
    ${({ theme }) => theme.color.canvas} 20%,
    ${({ theme }) => theme.color.canvas} 80%,
    transparent
  );
  opacity: 0.7;
  animation: ${slide} 14s linear infinite;
`;

// The same light as the closing call to action, rising from below the page.
const Glow = styled.span`
  position: absolute;
  inset: auto 0 0;
  height: 70%;
  background:
    radial-gradient(40% 80% at 30% 100%, ${({ theme }) => mix(theme.color.accent, 12)}, transparent 70%),
    radial-gradient(40% 90% at 52% 100%, ${({ theme }) => mix(theme.color.pink, 12)}, transparent 70%),
    radial-gradient(40% 80% at 74% 100%, ${({ theme }) => mix(theme.color.violet, 16)}, transparent 70%);
  pointer-events: none;
`;

const Inner = styled(Container)`
  position: relative;
`;

const Top = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(10)};

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: ${({ theme }) => theme.space(16)};
  }
`;

const Brand = styled.div`
  p {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    max-width: 22rem;
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const Mark = styled(Link)`
  ${type("title")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fg};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Language = styled.div`
  margin-top: ${({ theme }) => theme.space(7)};

  > span {
    ${type("overline")}
    display: block;
    margin-bottom: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  nav > p {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  ul {
    margin-top: ${({ theme }) => theme.space(3)};
  }
  a {
    ${type("body")}
    display: inline-block;
    padding-block: ${({ theme }) => theme.space(2)};
    border-radius: ${({ theme }) => theme.radius.control};
    color: ${({ theme }) => theme.color.fgMuted};
    transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

    ${({ theme }) => theme.media.md} {
      padding-block: ${({ theme }) => theme.space(1.5)};
    }
  }
  a:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

// The colour mode, and the way into the theme experiment.
const Appearance = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin-left: auto;

  && + nav {
    margin-left: 0;
  }
`;

const Bottom = styled.div`
  ${type("label")}
  font-weight: ${({ theme }) => theme.text.body.weight};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(6)};
  margin-top: ${({ theme }) => theme.space(10)};
  padding-top: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};

  nav {
    display: flex;
    gap: ${({ theme }) => theme.space(5)};
    margin-left: auto;
  }
  a {
    display: inline-block;
    padding-block: ${({ theme }) => theme.space(2)};
    border-radius: ${({ theme }) => theme.radius.control};
    color: ${({ theme }) => theme.color.fgMuted};
    transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
  }
  a:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Status = styled.span`
  --ring: ${({ theme }) => mix(theme.color.warning, 45)};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};

  &::before {
    content: "";
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.warning};
    animation: ${pulse} 2.6s ease-in-out infinite;
  }
`;

// The name, set large and lit from below, cropped by the bottom of the page.
// The drawn wordmark fills the width; only the upper part of the letters
// shows, fading out downwards. The dot of the i is cropped off the top.
const Wordmark = styled.div`
  aspect-ratio: 9;
  max-width: 1000px;
  margin: ${({ theme }) => theme.space(6)} auto 0;
  overflow: hidden;
  color: ${({ theme }) => mix(theme.color.fg, 34)};
  -webkit-mask-image: linear-gradient(180deg, #000, transparent 92%);
  mask-image: linear-gradient(180deg, #000, transparent 92%);
  user-select: none;

  svg {
    width: 100%;
    height: auto;
    margin-top: -8%;
  }
`;

export default function SiteFooter() {
  return (
    <Bar>
      <Hairline aria-hidden="true" />
      <Glow aria-hidden="true" />
      <Inner>
        <Top>
          <Brand>
            <Mark href="/" aria-label="Oxumi home">
              <Lockup size={36} decorative />
            </Mark>
            <p>Design a phone call as a flow. A voice agent makes it and returns the answers.</p>
            <Language>
              <span>Example calls in</span>
              <LanguageSwitch />
            </Language>
          </Brand>

          <Columns>
            {COLUMNS.map((column) => {
              const id = `footer-${column.title.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <nav key={column.title} aria-labelledby={id}>
                  <p id={id}>{column.title}</p>
                  <ul>
                    {column.links.map(([href, label]) => (
                      <li key={label}>
                        <Link href={href}>{label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              );
            })}
          </Columns>
        </Top>

        <Bottom>
          <span>© 2026 Oxumi</span>
          <Status>Early build</Status>
          <Appearance>
            <ThemeSegment labels={false} />
            <ThemeLabButton />
          </Appearance>
          <nav aria-label="Legal">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </Bottom>

        <Wordmark aria-hidden="true">
          <BrandWordmark size={200} tone="mono" decorative />
        </Wordmark>
      </Inner>
    </Bar>
  );
}
