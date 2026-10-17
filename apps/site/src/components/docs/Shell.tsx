"use client";

import { ArrowLeftOutlined, ArrowRightOutlined, MenuOutlined, SearchOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { LanguagePicker, LanguageSelect } from "@oxumi/ui/docs/CodeBlock";
import { NAV, type NavPage, search, type SearchEntry } from "./nav";
import { DOCS_TOP, MethodBadge, SPLIT } from "./ui";

// The frame around every docs page: a persistent sidebar (a drawer on small
// screens) with search and the map of the docs; a toolbar that says where you
// are and holds the sample-language picker; the page; and links to the pages
// before and after it.

const GROUPS = ["Get started", "Guides", "Reference"] as const;

function Search({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const results = search(query);

  // "/" focuses search from anywhere except another text field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      // Only the search that is on screen answers (sidebar or drawer).
      if (!input.current?.offsetParent) return;
      event.preventDefault();
      input.current.focus();
      input.current.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (entry: SearchEntry) => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
    onNavigate?.();
    router.push(entry.href);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setCursor((cursor + step + results.length) % results.length);
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      go(results[cursor]);
    }
  };

  const showing = open && query.trim().length > 0;
  return (
    <SearchBox>
      <SearchIcon />
      <SearchInput
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search the docs"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && results[cursor] ? `${listId}-${cursor}` : undefined}
        aria-autocomplete="list"
        placeholder="Search the docs"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <Kbd aria-hidden="true">/</Kbd>
      {showing && (
        <Results id={listId} role="listbox" aria-label="Search results">
          {results.length ? (
            results.map((entry, i) => (
              <Result
                key={entry.href}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === cursor}
                $on={i === cursor}
                // Keep focus in the input so the click is not lost to blur.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(entry)}
              >
                <ResultTitle>
                  {entry.method && (
                    <MethodBadge $method={entry.method} $small>
                      {entry.method}
                    </MethodBadge>
                  )}
                  <span>{entry.title}</span>
                </ResultTitle>
                <ResultMeta>{entry.path ?? entry.page}</ResultMeta>
              </Result>
            ))
          ) : (
            <Empty>No section or endpoint matches “{query.trim()}”.</Empty>
          )}
        </Results>
      )}
    </SearchBox>
  );
}

function Tree({
  current,
  active,
  onNavigate,
}: {
  current: NavPage | undefined;
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Documentation">
      {GROUPS.map((group) => (
        <Group key={group}>
          <GroupTitle>{group}</GroupTitle>
          <ul>
            {NAV.filter((page) => page.group === group).map((page) => {
              const here = page === current;
              return (
                <li key={page.href}>
                  <PageLink
                    href={page.href}
                    $on={here}
                    aria-current={here ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {page.title}
                  </PageLink>
                  {here && (
                    <Sections aria-label="On this page">
                      {page.sections.map((section) => (
                        <Fragment key={section.id}>
                          {section.group && <SectionGroup>{section.group}</SectionGroup>}
                          <li>
                            <SectionLink
                              href={`${page.href}#${section.id}`}
                              $on={active === section.id}
                              aria-current={active === section.id ? "location" : undefined}
                              onClick={onNavigate}
                            >
                              {section.method && (
                                <MethodBadge $method={section.method} $small>
                                  {section.method === "DELETE" ? "DEL" : section.method}
                                </MethodBadge>
                              )}
                              <span>{section.title}</span>
                            </SectionLink>
                          </li>
                        </Fragment>
                      ))}
                    </Sections>
                  )}
                </li>
              );
            })}
          </ul>
        </Group>
      ))}
    </nav>
  );
}

export default function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV.find((page) => page.href === pathname);
  const [active, setActive] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);

  // Scroll-spy: the section whose heading most recently crossed the top of
  // the reading area is the active one.
  useEffect(() => {
    const headings = [...document.querySelectorAll<HTMLElement>("[data-spy]")];
    if (!headings.length) return;
    const update = () => {
      const line = window.innerHeight * 0.28;
      let found = headings[0]!.id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) found = heading.id;
      }
      // At the very bottom the last section may never reach the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4)
        found = headings.at(-1)!.id;
      setActive(found);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const activeTitle = current?.sections.find((section) => section.id === active)?.title;
  const index = current ? NAV.indexOf(current) : -1;
  const previous = index > 0 ? NAV[index - 1] : undefined;
  const next = index >= 0 ? NAV[index + 1] : undefined;

  return (
    <Frame>
      <Toolbar>
        <MenuButton type="button" aria-label="Open the docs menu" onClick={() => setDrawer(true)}>
          <MenuOutlined />
        </MenuButton>
        <Crumbs aria-label="You are here">
          <span>Docs</span>
          <b>{current?.title ?? "Not found"}</b>
          {activeTitle && <em>{activeTitle}</em>}
        </Crumbs>
        <WidePicker />
        <NarrowPicker />
      </Toolbar>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        placement="left"
        size={320}
        title="Oxumi API docs"
      >
        <Search onNavigate={() => setDrawer(false)} />
        <Tree current={current} active={active} onNavigate={() => setDrawer(false)} />
      </Drawer>

      <Columns>
        <Sidebar>
          <Brand href="/docs">
            API docs <span>v1</span>
          </Brand>
          <Search />
          <Tree current={current} active={active} />
        </Sidebar>

        <Main>
          {children}
          <Pager aria-label="More pages">
            {previous ? (
              <PagerLink href={previous.href} $side="left">
                <small>
                  <ArrowLeftOutlined /> Previous
                </small>
                {previous.title}
              </PagerLink>
            ) : (
              <span />
            )}
            {next && (
              <PagerLink href={next.href} $side="right">
                <small>
                  Next <ArrowRightOutlined />
                </small>
                {next.title}
              </PagerLink>
            )}
          </Pager>
        </Main>
      </Columns>
    </Frame>
  );
}

// The site's bar publishes its height as --site-nav-height; until it does,
// the fallback matches the bar's current size.
const Frame = styled.div`
  --docs-nav: var(--site-nav-height, ${({ theme }) => theme.space(19)});
  --docs-top: calc(var(--docs-nav) + ${({ theme }) => theme.space(11)});
  width: 100%;
  max-width: ${({ theme }) => theme.space(400)};
  margin-inline: auto;
  padding: var(--docs-nav) ${({ theme }) => theme.space(4)} 0;

  ${({ theme }) => theme.media.sm} {
    padding-inline: ${({ theme }) => theme.layout.gutter};
  }
`;

const Toolbar = styled.div`
  position: sticky;
  z-index: 9;
  top: var(--docs-nav);
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(11)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.canvas};

  /* Nothing scrolls into view between the top of the window and this bar. */
  &::before {
    content: "";
    position: absolute;
    right: 0;
    bottom: 100%;
    left: 0;
    height: var(--docs-nav);
    background: ${({ theme }) => theme.color.canvas};
  }
`;

const WidePicker = styled(LanguagePicker)`
  display: none;
  margin-left: auto;

  ${SPLIT} {
    display: flex;
  }
`;

const NarrowPicker = styled(LanguageSelect)`
  margin-left: auto;

  ${SPLIT} {
    display: none;
  }
`;

const Columns = styled.div`
  padding-top: ${({ theme }) => theme.space(5)};

  ${({ theme }) => theme.media.md} {
    display: grid;
    grid-template-columns: ${({ theme }) => theme.space(52)} minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(8)};
  }
`;

const Main = styled.div`
  min-width: 0;
  padding-bottom: ${({ theme }) => theme.space(16)};
`;

const Pager = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(6)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const PagerLink = styled(Link)<{ $side: "left" | "right" }>`
  ${type("label")}
  display: block;
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  font-weight: 600;
  color: ${({ theme }) => theme.color.fg};
  text-align: ${({ $side }) => $side};
  transition: border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.lineStrong};
  }
  small {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

/* ---------- sidebar ---------- */

const Sidebar = styled.aside`
  display: none;

  ${({ theme }) => theme.media.md} {
    position: sticky;
    top: calc(${DOCS_TOP} + ${({ theme }) => theme.space(5)});
    display: block;
    align-self: start;
    max-height: calc(100vh - ${DOCS_TOP} - ${({ theme }) => theme.space(5)});
    padding-right: ${({ theme }) => theme.space(2)};
    padding-bottom: ${({ theme }) => theme.space(10)};
    overflow-y: auto;
    scrollbar-width: thin;
  }
`;

const Brand = styled(Link)`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  font-weight: 600;
  color: ${({ theme }) => theme.color.fg};

  span {
    ${type("caption")}
    padding: 0 ${({ theme }) => theme.space(1.5)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Group = styled.div`
  margin-top: ${({ theme }) => theme.space(5)};
`;

const GroupTitle = styled.p`
  ${type("overline")}
  margin-bottom: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const PageLink = styled(Link)<{ $on: boolean }>`
  ${type("label")}
  display: block;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2.5)};
  margin-inline: -${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $on }) => ($on ? theme.color.hover : "transparent")};
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Sections = styled.ul`
  margin: ${({ theme }) => theme.space(1)} 0 ${({ theme }) => theme.space(2)};
  border-left: 1px solid ${({ theme }) => theme.color.line};
`;

const SectionGroup = styled.li`
  ${type("overline")}
  padding: ${({ theme }) => theme.space(3)} 0 ${({ theme }) => theme.space(1)}
    ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgFaint};
`;

const SectionLink = styled(Link)<{ $on: boolean }>`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin-left: -1px;
  padding: ${({ theme }) => theme.space(1.25)} 0 ${({ theme }) => theme.space(1.25)}
    ${({ theme }) => theme.space(3)};
  border-left: 1px solid ${({ theme, $on }) => ($on ? theme.color.accentLine : "transparent")};
  font-weight: 400;
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgSubtle)};
  transition:
    color ${({ theme }) => theme.motion.fast},
    border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/* ---------- search ---------- */

const SearchBox = styled.div`
  position: relative;
`;

const SearchIcon = styled(SearchOutlined)`
  position: absolute;
  top: 50%;
  left: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgSubtle};
  transform: translateY(-50%);
  pointer-events: none;
`;

const SearchInput = styled.input`
  ${type("label")}
  width: 100%;
  height: ${({ theme }) => theme.space(9)};
  padding: 0 ${({ theme }) => theme.space(9)} 0 ${({ theme }) => theme.space(9)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.fg};
  transition: border-color ${({ theme }) => theme.motion.fast};

  &::placeholder {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
  &:focus {
    border-color: ${({ theme }) => theme.color.accentLine};
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }
`;

const Kbd = styled.kbd`
  ${type("caption")}
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.space(2)};
  display: grid;
  place-items: center;
  width: ${({ theme }) => theme.space(5)};
  height: ${({ theme }) => theme.space(5)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.space(1)};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgSubtle};
  transform: translateY(-50%);
  pointer-events: none;
`;

const Results = styled.ul`
  position: absolute;
  z-index: 5;
  top: calc(100% + ${({ theme }) => theme.space(1.5)});
  left: 0;
  width: max(100%, ${({ theme }) => theme.space(80)});
  max-width: calc(100vw - ${({ theme }) => theme.space(12)});
  padding: ${({ theme }) => theme.space(1.5)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.overlay};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

const Result = styled.li<{ $on: boolean }>`
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $on }) => ($on ? theme.color.hover : "transparent")};
  cursor: pointer;
`;

const ResultTitle = styled.div`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fg};
`;

const ResultMeta = styled.div`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(0.5)};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Empty = styled.li`
  ${type("label")}
  padding: ${({ theme }) => theme.space(3)};
  font-weight: 400;
  color: ${({ theme }) => theme.color.fgMuted};
`;

/* ---------- toolbar parts ---------- */

const MenuButton = styled.button`
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.space(8)};
  height: ${({ theme }) => theme.space(8)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
  color: ${({ theme }) => theme.color.fg};
  cursor: pointer;

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const Crumbs = styled.p`
  ${type("label")}
  display: flex;
  min-width: 0;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};
  white-space: nowrap;

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  em {
    min-width: 0;
    overflow: hidden;
    font-style: normal;
    text-overflow: ellipsis;
  }
  b::before,
  em::before {
    content: "/";
    margin-right: ${({ theme }) => theme.space(2)};
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;
