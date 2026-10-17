"use client";

import { ArrowRightOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import Link from "next/link";
import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { ThemeLabButton } from "@oxumi/ui/theme/ThemeLab";
import { ThemeSegment } from "@oxumi/ui/theme/ThemeSwitch";
import { type } from "@oxumi/ui/design/typography";
import { LanguageSwitch } from "../language";
import { DOCS, type Href, LINKS, type MenuId, PRODUCT, SCENARIO_ITEMS, USE_CASE_ITEMS } from "./data";
import { Marker, MethodTag, Numeral } from "./panels/parts";
import { focusRing, MORPH } from "./styles";
import { routes } from "@/lib/routes";

// The menu below the medium breakpoint: a sheet that drops over the whole
// screen from under the bar. Its first page is the four destinations, set
// large; a destination with more inside it slides a second page in from the
// right, the way a phone's own settings do.

const FOCUSABLE = "a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])";

const Root = styled.div`
  position: fixed;
  inset: 0;
  /* Over everything else on the page, the floating Themes button included;
     the bar rises above it in turn while the sheet is open. */
  z-index: 1101;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  padding-top: calc(var(--site-nav-height) + ${({ theme }) => theme.space(2)});
  background: ${({ theme }) => theme.color.canvas};
  clip-path: inset(0 0 100% 0);
  visibility: hidden;
  transition:
    clip-path ${MORPH} ${({ theme }) => theme.motion.ease},
    visibility 0s linear ${MORPH};

  &[data-open="true"] {
    clip-path: inset(0);
    visibility: visible;
    transition-delay: 0s;
  }
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

// Two pages side by side; the track slides to show one.
const Track = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Page = styled.div<{ $side: "left" | "right" }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  overflow-y: auto;
  overscroll-behavior: contain;
  opacity: 0;
  visibility: hidden;
  transform: translateX(${({ $side }) => ($side === "left" ? "-24%" : "100%")});
  transition:
    transform ${MORPH} ${({ theme }) => theme.motion.ease},
    opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    visibility 0s linear ${MORPH};

  &[data-shown="true"] {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 0s;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    transform: none;
  }
`;

// Each row rises into place a beat after the one above it.
const rise = css`
  opacity: 0;
  transform: translateY(${({ theme }) => theme.space(4)});
  transition:
    opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    transform 520ms ${({ theme }) => theme.motion.ease};

  [data-shown="true"] > &,
  [data-shown="true"] > * > & {
    opacity: 1;
    transform: none;
    transition-delay: calc(90ms + var(--i, 0) * 45ms);
  }
  ${({ theme }) => theme.media.reducedMotion} {
    transform: none;
  }
`;

const Big = styled.li`
  ${rise}
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  a,
  button {
    ${focusRing}
    display: flex;
    align-items: baseline;
    gap: ${({ theme }) => theme.space(4)};
    width: 100%;
    padding: ${({ theme }) => theme.space(4)} 0;
    border: 0;
    background: transparent;
    color: ${({ theme }) => theme.color.fg};
    font-family: ${({ theme }) => theme.font.display};
    font-size: 2.25rem;
    line-height: 2.5rem;
    letter-spacing: ${({ theme }) => theme.text.display.tracking};
    text-align: left;
    cursor: pointer;
  }
  small {
    ${type("code")}
    width: ${({ theme }) => theme.space(5)};
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: ${({ theme }) => theme.text.caption.size};
  }
  .anticon {
    margin-left: auto;
    align-self: center;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 13px;
  }
  [aria-current="page"] small,
  [data-current="true"] small {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Setting = styled.div`
  ${rise}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  /* The settings sit at the foot of the page, above the actions. */
  ul + & {
    margin-top: auto;
    border-top: 0;
  }
  &:last-child {
    padding-bottom: 0;
  }

  p {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  > div {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
  }
`;

const Back = styled.button`
  ${type("label")}
  ${focusRing}
  ${rise}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(9)};
  margin-left: -${({ theme }) => theme.space(1)};
  padding-inline: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  cursor: pointer;

  .anticon {
    font-size: 11px;
  }
`;

const Heading = styled(Link)`
  ${focusRing}
  ${rise}
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fg};
  font-family: ${({ theme }) => theme.font.display};
  font-size: 2.25rem;
  line-height: 2.5rem;

  .anticon {
    color: ${({ theme }) => theme.color.accentText};
    font-size: 15px;
  }
`;

const Label = styled.p`
  ${type("overline")}
  ${rise}
  padding: ${({ theme }) => theme.space(5)} 0 ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Entry = styled(Link)`
  ${focusRing}
  ${rise}
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  column-gap: ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(2.5)};

  > :first-child {
    grid-row: span 2;
  }
  strong {
    ${type("heading")}
    grid-column: 2;
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  small {
    ${type("body")}
    grid-column: 2;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Pairs = styled.div`
  ${rise}
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: ${({ theme }) => theme.space(4)};

  a {
    ${type("body")}
    ${focusRing}
    padding-block: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Endpoint = styled(Link)`
  ${focusRing}
  ${rise}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12.5px;
  line-height: 18px;

  span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: none;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)}
    calc(${({ theme }) => theme.space(4)} + env(safe-area-inset-bottom));
  border-top: 1px solid ${({ theme }) => theme.color.line};
  opacity: 0;
  transform: translateY(${({ theme }) => theme.space(4)});
  transition:
    opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
    transform 520ms ${({ theme }) => theme.motion.ease};

  [data-open="true"] > & {
    opacity: 1;
    transform: none;
    transition-delay: 260ms;
  }

  a {
    ${type("heading")}
    ${focusRing}
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.space(2)};
    height: ${({ theme }) => theme.space(12)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.card};
    color: ${({ theme }) => theme.color.fg};
  }
  a:last-child {
    border-color: transparent;
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentFg};
  }
  .anticon {
    font-size: 12px;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    transform: none;
  }
`;

const order = (i: number) => ({ "--i": i }) as CSSProperties;

function Detail({ menu, onNavigate }: { menu: MenuId; onNavigate: () => void }) {
  if (menu === "product") {
    return (
      <>
        <Heading href={PRODUCT.overview.href} onClick={onNavigate} style={order(1)}>
          Product <ArrowRightOutlined aria-hidden />
        </Heading>
        <Label style={order(2)}>How a call is made</Label>
        {PRODUCT.steps.map((step, i) => (
          <Entry key={step.href} href={step.href} onClick={onNavigate} style={order(3 + i)}>
            <Numeral>0{i + 1}</Numeral>
            <strong>{step.title}</strong>
            <small>{step.note}</small>
          </Entry>
        ))}
        <Label style={order(6)}>More</Label>
        <Pairs style={order(7)}>
          {PRODUCT.more.map((item) => (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              {item.title}
            </Link>
          ))}
        </Pairs>
      </>
    );
  }
  if (menu === "use-cases") {
    return (
      <>
        <Heading href="/use-cases" onClick={onNavigate} style={order(1)}>
          Use cases <ArrowRightOutlined aria-hidden />
        </Heading>
        <Label style={order(2)}>By team</Label>
        {USE_CASE_ITEMS.map(({ href, title, note, useCase }, i) => (
          <Entry
            key={href}
            href={href}
            onClick={onNavigate}
            style={{ ...order(3 + i), "--tone": useCase.tone } as CSSProperties}
          >
            <Marker />
            <strong>{title}</strong>
            <small>{note}</small>
          </Entry>
        ))}
        <Label style={order(7)}>Also a good fit</Label>
        <Pairs style={order(8)}>
          {SCENARIO_ITEMS.map(({ href, title }) => (
            <Link key={title} href={href} onClick={onNavigate}>
              {title}
            </Link>
          ))}
        </Pairs>
      </>
    );
  }
  return (
    <>
      <Heading href="/docs" onClick={onNavigate} style={order(1)}>
        Docs <ArrowRightOutlined aria-hidden />
      </Heading>
      <Label style={order(2)}>Get started</Label>
      {DOCS.start.map((page, i) => (
        <Entry key={page.href} href={page.href} onClick={onNavigate} style={order(3 + i)}>
          <Numeral>0{i + 1}</Numeral>
          <strong>{page.title}</strong>
          <small>{page.note}</small>
        </Entry>
      ))}
      <Label style={order(7)}>Guides</Label>
      <Pairs style={order(8)}>
        {DOCS.guides.map((page) => (
          <Link key={page.href} href={page.href} onClick={onNavigate}>
            {page.title}
          </Link>
        ))}
      </Pairs>
      <Label style={order(9)}>Endpoints</Label>
      {DOCS.endpoints.map((endpoint) => (
        <Endpoint
          key={endpoint.href}
          href={endpoint.href}
          aria-label={`${endpoint.title}: ${endpoint.method} ${endpoint.path}`}
          onClick={onNavigate}
          style={order(10)}
        >
          <MethodTag $method={endpoint.method}>{endpoint.method}</MethodTag>
          <span>{endpoint.path}</span>
        </Endpoint>
      ))}
    </>
  );
}

export default function MobileSheet({
  id,
  open,
  active,
  bar,
  onClose,
}: {
  id: string;
  open: boolean;
  // The link for the page being viewed.
  active: Href | null;
  // The bar above the sheet: its controls stay in the tab order while open.
  bar: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuId | null>(null);
  // The last menu shown stays rendered while its page slides away.
  const [last, setLast] = useState<MenuId>("product");
  const opener = useRef<HTMLElement | null>(null);
  const back = useRef<HTMLButtonElement>(null);

  // Each opening starts from the first page.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setMenu(null);
  }

  useEffect(() => {
    if (!open) return;
    // The page behind must not scroll under the sheet.
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      // Keep the caret within the bar and the sheet.
      const stops = [bar.current, root.current].flatMap((scope) =>
        scope
          ? [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
              (el) => !el.closest("[inert]") && el.getClientRects().length > 0,
            )
          : [],
      );
      const first = stops[0];
      const final = stops[stops.length - 1];
      if (!first || !final) return;
      const at = document.activeElement;
      if (event.shiftKey && (at === first || !stops.includes(at as HTMLElement))) {
        event.preventDefault();
        final.focus();
      } else if (!event.shiftKey && (at === final || !stops.includes(at as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = overflow;
      removeEventListener("keydown", onKey);
    };
  }, [open, bar]);

  const enter = (next: MenuId, from: HTMLElement) => {
    opener.current = from;
    setLast(next);
    setMenu(next);
    // Once the page is showing, the caret goes with it.
    requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
  };
  const leave = () => {
    setMenu(null);
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  };

  return (
    <Root ref={root} id={id} data-open={open} role="dialog" aria-modal aria-label="Menu" inert={!open}>
      <Track>
        <Page $side="left" data-shown={open && menu === null} inert={menu !== null}>
          <ul>
            {LINKS.map(({ href, label, menu: target }, i) => (
              <Big key={href} style={order(i)}>
                {target ? (
                  <button
                    type="button"
                    data-current={active === href}
                    onClick={(event) => enter(target, event.currentTarget)}
                  >
                    <small>0{i + 1}</small>
                    {label}
                    <RightOutlined aria-hidden />
                  </button>
                ) : (
                  <Link href={href} aria-current={active === href ? "page" : undefined} onClick={onClose}>
                    <small>0{i + 1}</small>
                    {label}
                  </Link>
                )}
              </Big>
            ))}
          </ul>
          <Setting style={order(LINKS.length)}>
            <p>Example calls speak</p>
            <LanguageSwitch showSoon={false} />
          </Setting>
          <Setting style={order(LINKS.length + 1)}>
            <p>Appearance</p>
            <div>
              <ThemeSegment labels={false} />
              <ThemeLabButton onOpen={onClose} />
            </div>
          </Setting>
        </Page>
        <Page $side="right" data-shown={open && menu !== null} inert={menu === null}>
          <Back ref={back} type="button" onClick={leave} style={order(0)}>
            <LeftOutlined aria-hidden /> Menu
          </Back>
          <Detail menu={menu ?? last} onNavigate={onClose} />
        </Page>
      </Track>
      <Actions>
        <Link href={routes.login} onClick={onClose}>
          Sign in
        </Link>
        <Link href={routes.signup} onClick={onClose}>
          Get started <ArrowRightOutlined aria-hidden />
        </Link>
      </Actions>
    </Root>
  );
}
