"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// Shared building blocks for the landing page. Every section uses these so
// spacing, headings and motion stay consistent across the page.

export const Section = styled.section`
  position: relative;
  padding: ${({ theme }) => theme.space(16)} ${({ theme }) => theme.layout.gutter};
  scroll-margin-top: ${({ theme }) => theme.space(20)};

  ${({ theme }) => theme.media.md} {
    padding-block: ${({ theme }) => theme.space(24)};
  }
`;

export const Container = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.content};
  margin-inline: auto;
`;

export const Eyebrow = styled.p`
  ${type("overline")}
  color: ${({ theme }) => theme.color.accentText};
`;

export const Heading = styled.h2`
  ${type("display")}
  margin-top: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fg};
  text-wrap: balance;

  em {
    font-style: italic;
  }
  /* <span data-muted> dims the second half of a two-part heading. */
  [data-muted] {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export const Lede = styled.p`
  ${type("lede")}
  max-width: 40rem;
  margin-top: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

export const glass = css`
  border: 1px solid ${({ theme }) => theme.color.line};
  background: color-mix(in srgb, ${({ theme }) => theme.color.raised} 60%, transparent);
  backdrop-filter: blur(18px);
`;

export const Glass = styled.div`
  ${glass}
  border-radius: ${({ theme }) => theme.radius.panel};
`;

// Brand gradient clipped to text, slowly drifting.
export const GradientText = styled.span`
  background: linear-gradient(
    100deg,
    ${({ theme }) => theme.color.accentLine},
    ${({ theme }) => theme.color.pink} 35%,
    ${({ theme }) => theme.color.violet} 65%,
    ${({ theme }) => theme.color.accentLine}
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: drift 7s linear infinite;

  @keyframes drift {
    to {
      background-position: -250% 0;
    }
  }
`;

// Home is the expressive page; every other page keeps motion out of the way.
export function useCalmMotion(): boolean {
  const pathname = usePathname();
  return pathname !== "/" && !pathname.startsWith("/preview");
}

const RevealBox = styled.div<{ $delay: number; $calm: boolean }>`
  opacity: 0;
  transform: translateY(${({ $calm }) => ($calm ? 8 : 32)}px);
  transition:
    opacity ${({ theme, $calm }) => ($calm ? "500ms" : theme.motion.slow)}
      ${({ theme }) => theme.motion.ease},
    transform ${({ theme, $calm }) => ($calm ? "500ms" : theme.motion.slow)}
      ${({ theme }) => theme.motion.ease};
  transition-delay: ${({ $delay, $calm }) => ($calm ? 0 : $delay)}ms;

  &[data-in="true"] {
    opacity: 1;
    transform: none;
  }

  ${({ theme }) => theme.media.reducedMotion} {
    opacity: 1;
    transform: none;
  }
`;

// Fades and lifts its children in the first time they scroll into view. Away
// from the home page the lift is slight, quicker and never staggered.
// Descendants can key their own animations off the [data-in="true"] ancestor.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const calm = useCalmMotion();

  useEffect(() => {
    const el = ref.current!;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry!.isIntersecting) return;
        el.dataset.in = "true";
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <RevealBox ref={ref} $delay={delay} $calm={calm} className={className}>
      {children}
    </RevealBox>
  );
}
