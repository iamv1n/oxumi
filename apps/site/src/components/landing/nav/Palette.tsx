"use client";

import { CheckOutlined, EnterOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { search as searchDocs } from "@/components/docs/nav";
import type { Method } from "@/components/docs/ui";
import { BRAND_LABELS, BRANDS } from "@oxumi/ui/design/palettes";
import { useThemeMode } from "@oxumi/ui/design/theme-mode";
import { THEME_LAB_ENABLED } from "@oxumi/ui/design/theme-shared";
import { type } from "@oxumi/ui/design/typography";
import { EXAMPLE_LANGUAGES, useExampleLanguage } from "../language";
import { DOCS, type Item, LINKS, PRODUCT, SCENARIO_ITEMS, USE_CASE_ITEMS } from "./data";
import { MethodTag } from "./panels/parts";
import { routes } from "@/lib/routes";

// The quick navigator: every page, use case and docs section, plus the
// site's few settings, one keystroke away. A combobox over a listbox, so the
// caret stays in the field while the arrows move through the results.

interface Entry {
  id: string;
  group: string;
  title: string;
  note?: string;
  // Extra words to match on.
  words?: string;
  method?: Method;
  // Somewhere to go, or something to do (the navigator then stays open).
  href?: string;
  run?: () => void;
  on?: boolean;
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: none; }
`;

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 14vh ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)};
  background: color-mix(in srgb, ${({ theme }) => theme.color.canvas} 64%, transparent);
  animation: ${fade} ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease} both;
`;

const Dialog = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${({ theme }) => theme.space(150)};
  max-height: min(${({ theme }) => theme.space(124)}, 72vh);
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.island};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  animation: ${rise} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease} both;
`;

const Field = styled.label`
  display: flex;
  align-items: center;
  flex: none;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(13)};
  padding-inline: ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};

  input {
    ${type("body")}
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${({ theme }) => theme.color.fg};
    /* 16px keeps iOS from zooming the page on focus. */
    font-size: 16px;
    outline: none;
    box-shadow: none;
  }
  input::placeholder {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Key = styled.kbd`
  display: inline-grid;
  place-items: center;
  min-width: ${({ theme }) => theme.space(5)};
  height: ${({ theme }) => theme.space(5)};
  padding-inline: ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.small};
  color: ${({ theme }) => theme.color.fgSubtle};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  line-height: 1;
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  padding: ${({ theme }) => theme.space(2)};
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const Group = styled.p`
  ${type("overline")}
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};

  &:first-child {
    padding-top: ${({ theme }) => theme.space(1.5)};
  }
`;

const Option = styled.div`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(9)};
  padding-inline: ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
  cursor: pointer;
  scroll-margin: ${({ theme }) => theme.space(9)} 0;

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .note {
    ${type("caption")}
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
  }
  .path {
    font-family: ${({ theme }) => theme.font.mono};
  }
  .go {
    margin-left: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 11px;
    opacity: 0;
  }
  .tick {
    margin-left: auto;
    color: ${({ theme }) => theme.color.accentText};
    font-size: 12px;
  }

  &[aria-selected="true"] {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  &[aria-selected="true"] .go {
    opacity: 1;
  }
`;

const Empty = styled.p`
  ${type("body")}
  padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgSubtle};
  text-align: center;
`;

const Foot = styled.div`
  ${type("caption")}
  display: flex;
  align-items: center;
  flex: none;
  gap: ${({ theme }) => theme.space(4)};
  height: ${({ theme }) => theme.space(10)};
  padding-inline: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};

  span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
  }
  span:last-child {
    margin-left: auto;
  }
`;

const matches = (entry: Entry, words: string[]) => {
  const haystack = `${entry.title} ${entry.note ?? ""} ${entry.words ?? ""} ${entry.group}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
};

export default function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { language, setLanguage } = useExampleLanguage();
  const { preference, brand, setPreference, setBrand } = useThemeMode();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  // Give the caret back to whatever opened the navigator.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, []);

  const results = useMemo(() => {
    const pages: Entry[] = [
      { id: "home", group: "Pages", title: "Home", href: "/" },
      ...LINKS.map((link) => ({ id: link.href, group: "Pages", title: link.label, href: link.href })),
      { id: "signup", group: "Pages", title: "Get started", note: "Create an account", href: routes.signup },
      { id: "login", group: "Pages", title: "Sign in", href: routes.login },
    ];
    const product: Entry[] = [...PRODUCT.steps, ...PRODUCT.more].map((item: Item) => ({
      id: item.href,
      group: "Product",
      title: item.title,
      note: item.note,
      href: item.href,
    }));
    const useCases: Entry[] = [
      ...USE_CASE_ITEMS.map((item) => ({
        id: item.href,
        group: "Use cases",
        title: item.title,
        note: item.note,
        words: item.useCase.line,
        href: item.href,
      })),
      ...SCENARIO_ITEMS.map((item) => ({
        id: item.title,
        group: "Use cases",
        title: item.title,
        note: item.note,
        words: item.scenario.who,
        href: item.href,
      })),
    ];
    const docs: Entry[] = [...DOCS.start, ...DOCS.guides].map((page) => ({
      id: page.href,
      group: "Docs",
      title: page.title,
      note: page.note,
      words: "api documentation",
      href: page.href,
    }));
    const settings: Entry[] = [
      ...(
        [
          ["light", "Light mode"],
          ["dark", "Dark mode"],
          ["system", "Match my device"],
        ] as const
      ).map(([value, title]) => ({
        id: `mode-${value}`,
        group: "Appearance",
        title,
        words: "theme colour color mode appearance",
        run: () => setPreference(value),
        on: preference === value,
      })),
      ...EXAMPLE_LANGUAGES.map((option) => ({
        id: `language-${option.id}`,
        group: "Example calls",
        title: `Example calls in ${option.label}`,
        words: "language speak",
        run: () => setLanguage(option.id),
        on: language === option.id,
      })),
    ];
    const themes: Entry[] = THEME_LAB_ENABLED
      ? BRANDS.map((value) => ({
          id: `brand-${value}`,
          group: "Themes",
          title: `${BRAND_LABELS[value].name} theme`,
          note: BRAND_LABELS[value].note,
          words: "theme colour color brand palette",
          run: () => setBrand(value),
          on: brand === value,
        }))
      : [];

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // Nothing typed: the places most people are looking for.
    if (!words.length) {
      return [
        ...pages.slice(0, 5),
        ...useCases.slice(0, USE_CASE_ITEMS.length),
        ...docs.slice(0, DOCS.start.length),
        ...settings.slice(0, 3),
      ];
    }
    // Sections and endpoints come from the docs' own ranked search.
    const sections: Entry[] = searchDocs(query, 8).map((hit) => ({
      id: hit.href,
      group: "Docs",
      title: hit.title,
      note: hit.path ?? hit.page,
      method: hit.method,
      href: hit.href,
    }));
    const found = (entries: Entry[]) => entries.filter((entry) => matches(entry, words));
    return [
      ...found(pages),
      ...found(product),
      ...found(useCases),
      ...sections,
      ...found(docs).filter((page) => !sections.some((hit) => hit.id === page.id)),
      ...found(settings),
      ...found(themes),
    ];
  }, [query, preference, brand, language, setPreference, setBrand, setLanguage]);

  // Results are listed group by group, in the order the groups first appear.
  const grouped = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const entry of results) groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
    return [...groups];
  }, [results]);
  const flat = grouped.flatMap(([, entries]) => entries);
  const active = flat[Math.min(cursor, flat.length - 1)];

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active?.id]);

  const choose = (entry: Entry) => {
    if (entry.run) return entry.run();
    onClose();
    if (!entry.href) return;
    // The app's pages are on another origin; the router only knows this site.
    if (/^https?:/.test(entry.href)) window.location.assign(entry.href);
    else router.push(entry.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!flat.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setCursor((Math.min(cursor, flat.length - 1) + step + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active) choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === "Tab") {
      // The field is the dialog's only stop.
      event.preventDefault();
    }
  };

  return (
    <Scrim
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Dialog role="dialog" aria-modal aria-label="Quick navigator" onKeyDown={onKeyDown}>
        <Field>
          <SearchOutlined aria-hidden />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={active ? `${id}-${active.id}` : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, use cases, docs and settings"
            placeholder="Search pages, use cases, endpoints…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
          />
          <Key>esc</Key>
        </Field>
        <List ref={list} id={`${id}-list`} role="listbox" aria-label="Results">
          {grouped.map(([group, entries]) => (
            <div key={group} role="group" aria-label={group}>
              <Group aria-hidden>{group}</Group>
              {entries.map((entry) => (
                <Option
                  key={entry.id}
                  id={`${id}-${entry.id}`}
                  role="option"
                  aria-selected={entry === active}
                  onPointerMove={() => setCursor(flat.indexOf(entry))}
                  onClick={() => choose(entry)}
                >
                  {entry.method && <MethodTag $method={entry.method}>{entry.method}</MethodTag>}
                  <span className="title">{entry.title}</span>
                  {entry.note && <span className={entry.method ? "note path" : "note"}>{entry.note}</span>}
                  {entry.on ? (
                    <CheckOutlined className="tick" aria-label="Current" />
                  ) : (
                    <EnterOutlined className="go" aria-hidden />
                  )}
                </Option>
              ))}
            </div>
          ))}
          {!flat.length && <Empty>Nothing matches “{query}”.</Empty>}
        </List>
        <Foot aria-hidden>
          <span>
            <Key>↑</Key>
            <Key>↓</Key> move
          </span>
          <span>
            <Key>↵</Key> open
          </span>
          <span>Try “POST”, “webhook” or “dark”</span>
        </Foot>
      </Dialog>
    </Scrim>
  );
}
