"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { sectionOpenKey } from "../projects/SettingsPanels";
import { useStoredFlag } from "../shell/useStoredFlag";
import { ACCOUNT_SCOPE, ACCOUNT_SECTIONS } from "./AccountSections";

// The account page's section list: a sticky column on wide screens, a strip
// of tabs under the top bar on narrow ones. Following a link opens the
// section if it was folded away, then scrolls to it.

const Nav = styled.nav`
  position: sticky;
  top: ${({ theme }) => theme.layout.topbar};
  z-index: 10;
  margin-inline: -${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(6)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.canvas};
  overflow-x: auto;
  scrollbar-width: none;

  ul {
    display: flex;
    gap: 2px;
  }

  ${({ theme }) => theme.media.md} {
    top: calc(${({ theme }) => theme.layout.topbar} + ${({ theme }) => theme.space(5)});
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    overflow: visible;

    ul {
      flex-direction: column;
    }
  }
`;

const Item = styled.a<{ $active: boolean; $danger: boolean }>`
  ${type("label")}
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.space(8)};
  padding-inline: ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $active }) => ($active ? theme.color.hover : "transparent")};
  color: ${({ theme, $active, $danger }) =>
    $danger ? theme.color.danger : $active ? theme.color.fg : theme.color.fgMuted};
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme, $danger }) => ($danger ? theme.color.danger : theme.color.fg)};
  }
`;

function NavLink({
  id,
  label,
  active,
  onGo,
}: {
  id: string;
  label: string;
  active: boolean;
  onGo: (id: string) => void;
}) {
  const [, setOpen] = useStoredFlag(sectionOpenKey(ACCOUNT_SCOPE, id), id !== "danger");
  const anchor = `${ACCOUNT_SCOPE}-${id}`;
  return (
    <li>
      <Item
        href={`#${anchor}`}
        $active={active}
        $danger={id === "danger"}
        aria-current={active ? "location" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
          onGo(id);
          const target = document.getElementById(anchor);
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
          // Continue from the section's heading for keyboard users.
          target?.querySelector<HTMLElement>("h2 button")?.focus({ preventScroll: true });
          history.replaceState(null, "", `#${anchor}`);
        }}
      >
        {label}
      </Item>
    </li>
  );
}

export function AccountNav() {
  const [active, setActive] = useState<string>(ACCOUNT_SECTIONS[0].id);

  // Highlight the section nearest the top of the viewport.
  useEffect(() => {
    const prefix = `${ACCOUNT_SCOPE}-`;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.slice(prefix.length);
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = ACCOUNT_SECTIONS.find((section) => visible.has(section.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    for (const section of ACCOUNT_SECTIONS) {
      const element = document.getElementById(`${prefix}${section.id}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <Nav aria-label="Account sections" data-tour="account-nav">
      <ul>
        {ACCOUNT_SECTIONS.map((section) => (
          <NavLink
            key={section.id}
            id={section.id}
            label={section.label}
            active={active === section.id}
            onGo={setActive}
          />
        ))}
      </ul>
    </Nav>
  );
}
