"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { ThemeToggle } from "@oxumi/ui/theme/ThemeSwitch";
import { routes } from "@/lib/routes";
import Showcase from "./Showcase";
import { Lockup } from "@oxumi/ui/brand";

const Screen = styled.main`
  display: grid;
  min-height: 100vh;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }
`;

const Aside = styled.aside`
  position: relative;
  display: none;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(10)};
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(12)};
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.md} {
    display: flex;
  }

  /* Two slow brand-coloured glows, echoing the landing page's orb. */
  &::before,
  &::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.4;
    animation: float 16s ease-in-out infinite alternate;
  }
  &::before {
    top: -6rem;
    left: -4rem;
    width: 24rem;
    height: 24rem;
    background: ${({ theme }) => theme.color.violet};
  }
  &::after {
    right: -6rem;
    bottom: -4rem;
    width: 22rem;
    height: 22rem;
    background: ${({ theme }) => theme.color.accent};
    animation-delay: -8s;
  }

  @keyframes float {
    to {
      transform: translate3d(2.5rem, 2rem, 0) scale(1.12);
    }
  }
`;

export const Brand = styled(Link)`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("heading")}
  color: ${({ theme }) => theme.color.fg};
`;

const Pitch = styled.div`
  position: relative;
  z-index: 1;

  h2 {
    ${type("display")}
    font-size: clamp(2.5rem, 3.8vw, 3.5rem);
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
  em {
    font-style: italic;
    background: ${({ theme }) => theme.gradient.brand};
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  /* Direct child only: the showcase below has paragraphs of its own. */
  > p {
    ${type("lede")}
    max-width: 26rem;
    margin: ${({ theme }) => theme.space(5)} 0 ${({ theme }) => theme.space(10)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Legal = styled.nav`
  position: relative;
  z-index: 1;
  display: flex;
  gap: ${({ theme }) => theme.space(5)};
  ${type("caption")}

  && a {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  && a:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const FormSide = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(5)};

  /* A faint dotted grid, fading out from the centre. */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      ${({ theme }) => theme.color.lineStrong} 1px,
      transparent 1px
    );
    background-size: 22px 22px;
    mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, black, transparent);
    opacity: 0.5;
    pointer-events: none;
  }
`;

const Corner = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space(4)};
  right: ${({ theme }) => theme.space(4)};
  z-index: 1;
`;

const Column = styled.div`
  position: relative;
  width: 100%;
  max-width: 440px;
`;

// The form sits on a raised card with the brand gradient along its top edge.
const Card = styled.div`
  position: relative;
  padding: ${({ theme }) => theme.space(7)} ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.pop};

  @media (min-width: 480px) {
    padding: ${({ theme }) => theme.space(9)} ${({ theme }) => theme.space(9)}
      ${({ theme }) => theme.space(8)};
  }

  &::before {
    content: "";
    position: absolute;
    top: -1px;
    left: ${({ theme }) => theme.space(10)};
    right: ${({ theme }) => theme.space(10)};
    height: 2px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.gradient.brand};
  }
`;

const MobileBrand = styled(Brand)`
  margin-bottom: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const Header = styled.header`
  margin-bottom: ${({ theme }) => theme.space(7)};

  .eyebrow {
    ${type("overline")}
    color: ${({ theme }) => theme.color.accentText};
  }
  h1 {
    ${type("display")}
    font-size: 2.5rem;
    line-height: 2.75rem;
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
  }
  p:not(.eyebrow) {
    ${type("body")}
    font-size: 0.9375rem;
    line-height: 1.5rem;
    margin-top: ${({ theme }) => theme.space(2.5)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  strong {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Below = styled.div`
  ${type("body")}
  margin-top: ${({ theme }) => theme.space(6)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-align: center;

  && a {
    font-weight: 500;
    color: ${({ theme }) => theme.color.accentText};
  }
  && a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
`;

const MobileLegal = styled(Legal)`
  justify-content: center;
  margin-top: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    && {
      display: none;
    }
  }
`;

// The frame shared by sign in, sign up and the password pages: brand and
// pitch on the left, one focused task on the right.
export default function AuthLayout({
  eyebrow,
  title,
  description,
  footer,
  children,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const legal = (
    <>
      <Link href={routes.terms}>Terms</Link>
      <Link href={routes.privacy}>Privacy</Link>
    </>
  );
  return (
    <Screen>
      <Aside>
        <Brand href={routes.home} aria-label="Oxumi home">
          <Lockup size={32} decorative />
        </Brand>
        <Pitch>
          <h2>
            Design the call. <em>The agent makes it.</em>
          </h2>
          <p>
            People answer in their own words. Your agent hands back clean,
            validated data.
          </p>
          <Showcase />
        </Pitch>
        <Legal aria-label="Legal">{legal}</Legal>
      </Aside>

      <FormSide>
        <Corner>
          <ThemeToggle />
        </Corner>
        <Column>
          <MobileBrand href={routes.home} aria-label="Oxumi home">
            <Lockup size={30} decorative />
          </MobileBrand>
          <Card>
            <Header>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </Header>
            {children}
          </Card>
          {footer && <Below>{footer}</Below>}
          <MobileLegal aria-label="Legal">{legal}</MobileLegal>
        </Column>
      </FormSide>
    </Screen>
  );
}
