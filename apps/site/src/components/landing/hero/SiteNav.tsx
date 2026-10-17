"use client";

import { ArrowRightOutlined, DownOutlined, SearchOutlined } from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import {
  type CSSProperties,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Actions,
  Bar,
  Brand,
  Find,
  GetStarted,
  Links,
  NavHeight,
  NavLink,
  Panel,
  Row,
  Rule,
  Sentinel,
  SignIn,
  Toggle,
  Trigger,
} from "../nav/bar";
import { activeLink, type Href, LINKS, type MenuId, MENUS } from "../nav/data";
import Indicator from "../nav/Indicator";
import MobileSheet from "../nav/MobileSheet";
import DocsPanel from "../nav/panels/DocsPanel";
import ProductPanel from "../nav/panels/ProductPanel";
import UseCasesPanel from "../nav/panels/UseCasesPanel";
import Prefs from "../nav/Prefs";
import Surface from "../nav/Surface";
import { GooFilter } from "./Goo";
import { Lockup } from "@oxumi/ui/brand";
import { routes } from "@/lib/routes";

// The site-wide nav, shared by every marketing page.
//
// One surface, three shapes. At the top of a page it is not there at all: the
// row floats open over the hero. Scroll and the same row gathers into a glass
// capsule. Point at Product, Use cases or Docs and that capsule grows
// downwards into the panel, changing height as the pointer moves between
// them. The pieces live in ../nav; this file is the state that ties them.

// Loaded the first time it is asked for, so it costs first paint nothing.
const Palette = lazy(() => import("../nav/Palette"));

// How long a panel outlives the pointer, so a slip past its edge is forgiven.
const GRACE = 160;

const noop = () => () => {};
// ⌘ on Apple keyboards, Ctrl elsewhere. The server cannot know: it renders ⌘.
const useShortcut = () =>
  useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  // The docs get a solid top bar instead of the floating capsule.
  const docs = pathname === "/docs" || pathname.startsWith("/docs/");
  const active = activeLink(pathname);
  const shortcut = useShortcut();
  const uid = useId();

  const [menu, setMenu] = useState<MenuId | null>(null);
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);
  const [hover, setHover] = useState<Href | null>(null);
  const [heights, setHeights] = useState<Record<MenuId, number>>({
    product: 0,
    "use-cases": 0,
    docs: 0,
  });

  const row = useRef<HTMLElement>(null);
  const links = useRef<HTMLUListElement>(null);
  const sentinel = useRef<HTMLSpanElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const items = useRef(new Map<string, HTMLElement>());
  const triggers = useRef(new Map<MenuId, HTMLButtonElement>());
  const panels = useRef(new Map<MenuId, HTMLDivElement>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // What the last press was made with: a mouse click follows the link, a tap
  // or a key opens the panel.
  const pointer = useRef("mouse");
  // Set when a panel is opened to move into it (arrow down).
  const enter = useRef(false);

  // Condensed once the top of the page has scrolled away. An observer, not a
  // scroll listener: it fires twice per visit, not once per frame.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry!.isIntersecting));
    observer.observe(sentinel.current!);
    return () => observer.disconnect();
  }, []);
  // The shape holds while a panel is open, so the panel is never re-laid-out
  // under the pointer; it catches up when the panel closes.
  const [compact, setCompact] = useState(false);
  if (menu === null && compact !== scrolled) setCompact(scrolled);

  // Following a link closes whatever was open.
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setMenu(null);
    setSheet(false);
    setPalette(false);
  }

  const open = useCallback((next: MenuId | null) => {
    clearTimeout(timer.current);
    setMenu(next);
  }, []);
  const closeSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenu(null), GRACE);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Condensed, the links move to the middle of the gap between brand and
  // actions. That gap's centre is the same before and after the two slide
  // in, so it is measured once per layout and applied as a transform.
  useEffect(() => {
    const place = () => {
      const list = links.current!;
      if (!list.offsetWidth) return;
      const gap = (brand.current!.offsetLeft + brand.current!.offsetWidth + actions.current!.offsetLeft) / 2;
      const shift = gap - (list.offsetLeft + list.offsetWidth / 2);
      row.current!.style.setProperty("--nav-links-shift", `${Math.round(shift)}px`);
    };
    const observer = new ResizeObserver(place);
    for (const el of [row, brand, links, actions]) observer.observe(el.current!);
    return () => observer.disconnect();
  }, []);

  // Panels are measured as laid out, so the surface knows how far to grow.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setHeights((current) => {
        const next = { ...current };
        for (const [id, el] of panels.current) next[id] = el.offsetHeight;
        return MENUS.every((id) => next[id] === current[id]) ? current : next;
      });
    });
    for (const el of panels.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (menu === null) return;
    if (enter.current) {
      enter.current = false;
      panels.current.get(menu)?.querySelector<HTMLElement>("a[href], button")?.focus();
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Back to the button that opened the panel, if the caret was inside it.
      if (panels.current.get(menu)?.contains(document.activeElement)) triggers.current.get(menu)?.focus();
      open(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (!links.current?.contains(event.target as Node)) open(null);
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onPointer);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onPointer);
    };
  }, [menu, open]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSheet(false);
      toggle.current?.focus();
    };
    // The sheet belongs to narrow screens only.
    const wide = matchMedia("(min-width: 900px)");
    const onWide = () => wide.matches && setSheet(false);
    addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [sheet]);

  // ⌘K anywhere; "/" too, except on the docs, where it is their own search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";
      const slash = !docs && event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!combo && !(slash && !typing(event.target))) return;
      event.preventDefault();
      open(null);
      setSheet(false);
      setPalette((value) => (combo ? !value : true));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [docs, open]);

  const panel = menu ? heights[menu] : 0;
  // The highlight rests on the open panel's link, else the hovered one, else
  // the current page.
  const lit = LINKS.find((link) => link.menu !== null && link.menu === menu)?.href ?? hover ?? active;
  const at = menu ? MENUS.indexOf(menu) : -1;

  return (
    <>
      <NavHeight $docs={docs} />
      <GooFilter />
      <Sentinel ref={sentinel} aria-hidden />
      <Bar data-docs={docs} data-sheet={sheet}>
        <Row
          ref={row}
          aria-label="Primary"
          data-docs={docs}
          data-compact={!docs && (compact || sheet)}
          data-open={menu !== null}
        >
          <Surface
            shown={!sheet && (menu !== null || (compact && !docs))}
            compact={compact && !docs}
            docs={docs}
            panel={panel}
          />
          <Rule aria-hidden>
            <b />
            <i />
          </Rule>
          <Brand ref={brand} href="/" aria-label="Oxumi home" onClick={() => setSheet(false)}>
            <Lockup size={28} decorative />
          </Brand>
          <Links
            ref={links}
            onPointerEnter={() => clearTimeout(timer.current)}
            onPointerLeave={(event) => {
              setHover(null);
              if (event.pointerType === "mouse") closeSoon();
            }}
          >
            <Indicator items={items} at={lit} held={menu !== null} />
            {LINKS.map(({ href, label, menu: id }) => {
              const current = active === href ? "page" : undefined;
              const mark = (node: HTMLLIElement | null) => {
                if (node) items.current.set(href, node);
                else items.current.delete(href);
              };
              if (id === null) {
                return (
                  <li key={href} ref={mark}>
                    <NavLink
                      href={href}
                      aria-current={current}
                      onPointerEnter={(event) => {
                        setHover(href);
                        if (event.pointerType === "mouse" && menu !== null) closeSoon();
                      }}
                      onFocus={() => setHover(href)}
                      onBlur={() => setHover(null)}
                    >
                      <span>{label}</span>
                    </NavLink>
                  </li>
                );
              }
              const index = MENUS.indexOf(id);
              const shown = menu === id;
              // Closed, a panel lifts away; passed over, it leaves to the side
              // the pointer came from and the next arrives from the other.
              const away = at < 0 ? "translateY(-8px)" : `translateX(${index < at ? -28 : 28}px)`;
              return (
                <li
                  key={href}
                  ref={mark}
                  onBlur={(event) => {
                    const to = event.relatedTarget;
                    if (shown && to && !event.currentTarget.contains(to)) open(null);
                  }}
                >
                  <Trigger
                    ref={(node) => {
                      if (node) triggers.current.set(id, node);
                      else triggers.current.delete(id);
                    }}
                    type="button"
                    aria-expanded={shown}
                    aria-controls={`${uid}-${id}`}
                    aria-current={current}
                    onPointerEnter={(event) => {
                      setHover(href);
                      if (event.pointerType === "mouse") open(id);
                    }}
                    onPointerDown={(event) => {
                      pointer.current = event.pointerType;
                    }}
                    onClick={(event) => {
                      // A mouse has already opened the panel by pointing; its
                      // click means "take me to the page".
                      if (event.detail > 0 && pointer.current === "mouse") {
                        open(null);
                        router.push(href);
                      } else open(shown ? null : id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowDown") return;
                      event.preventDefault();
                      if (shown) panels.current.get(id)?.querySelector<HTMLElement>("a[href], button")?.focus();
                      else {
                        enter.current = true;
                        open(id);
                      }
                    }}
                    onFocus={() => setHover(href)}
                    onBlur={() => setHover(null)}
                  >
                    <span>
                      {label}
                      <DownOutlined aria-hidden />
                    </span>
                  </Trigger>
                  <Panel
                    ref={(node) => {
                      if (node) panels.current.set(id, node);
                      else panels.current.delete(id);
                    }}
                    id={`${uid}-${id}`}
                    role="group"
                    aria-label={label}
                    data-open={shown}
                    style={
                      {
                        "--away": away,
                        "--cut": `${Math.max(0, heights[id] - panel)}px`,
                      } as CSSProperties
                    }
                  >
                    {id === "product" && <ProductPanel open={shown} onNavigate={() => open(null)} />}
                    {id === "use-cases" && <UseCasesPanel open={shown} onNavigate={() => open(null)} />}
                    {id === "docs" && (
                      <DocsPanel
                        open={shown}
                        onNavigate={() => open(null)}
                        shortcut={shortcut}
                        onSearch={() => {
                          open(null);
                          setPalette(true);
                        }}
                      />
                    )}
                  </Panel>
                </li>
              );
            })}
          </Links>
          <Actions ref={actions}>
            <Find
              type="button"
              aria-label={`Search the site (${shortcut})`}
              aria-haspopup="dialog"
              onClick={() => setPalette(true)}
            >
              <SearchOutlined aria-hidden />
              <kbd aria-hidden>{shortcut}</kbd>
            </Find>
            <Prefs />
            <SignIn href={routes.login}>Sign in</SignIn>
            <GetStarted href={routes.signup} onClick={() => setSheet(false)}>
              Get started <ArrowRightOutlined aria-hidden />
            </GetStarted>
            <Toggle
              ref={toggle}
              type="button"
              aria-label={sheet ? "Close menu" : "Open menu"}
              aria-expanded={sheet}
              aria-controls={`${uid}-sheet`}
              onClick={() => setSheet((value) => !value)}
            >
              <i />
              <i />
            </Toggle>
          </Actions>
        </Row>
      </Bar>
      <MobileSheet
        id={`${uid}-sheet`}
        open={sheet}
        active={active}
        bar={row}
        onClose={() => setSheet(false)}
      />
      {palette && (
        <Suspense fallback={null}>
          <Palette onClose={() => setPalette(false)} />
        </Suspense>
      )}
    </>
  );
}
