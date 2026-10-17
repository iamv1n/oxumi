"use client";

import {
  ApiOutlined,
  AppstoreOutlined,
  KeyOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useCallback, useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { breakpoint } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { routes } from "@/lib/routes";
import { useMediaQuery, useStoredFlag } from "./useStoredFlag";

// Project navigation. On wide screens it is a full sidebar that the user can
// collapse to an icon rail (the button at its top, or Cmd/Ctrl+B); below the
// `md` breakpoint it is always the rail.
//
// Collapsing changes the layout width in one step and animates only the
// panel drawn on top of it, so the main region (and a canvas inside it, such
// as the flow builder) is laid out once per toggle instead of once per frame.

export const SIDEBAR_STORAGE_KEY = "oxumi:sidebar-collapsed";
// Mirrors the stored choice so the server can render the right width.
export const SIDEBAR_COOKIE = "oxumi_sidebar";

const railWidth = css`
  width: ${({ theme }) => theme.layout.rail};
`;

// Reserves the sidebar's width in the layout. Never animated.
const Slot = styled.div<{ $collapsed: boolean }>`
  position: relative;
  flex: none;
  ${railWidth}

  ${({ theme }) => theme.media.md} {
    width: ${({ theme, $collapsed }) => ($collapsed ? theme.layout.rail : theme.layout.sidebar)};
  }
`;

const Aside = styled.nav<{ $collapsed: boolean; $animate: boolean }>`
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  ${railWidth}
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(2)};
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden auto;
  transition: ${({ theme, $animate }) =>
    $animate ? `width ${theme.motion.base} ${theme.motion.ease}` : "none"};

  .label {
    opacity: 0;
    white-space: nowrap;
    transition: ${({ theme, $animate }) =>
      $animate ? `opacity ${theme.motion.fast} ${theme.motion.ease}` : "none"};
  }

  ${({ theme }) => theme.media.md} {
    width: ${({ theme, $collapsed }) => ($collapsed ? theme.layout.rail : theme.layout.sidebar)};

    .label {
      opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
      transition-delay: ${({ theme, $collapsed }) => ($collapsed ? "0ms" : theme.motion.fast)};
    }
  }
`;

// The row above the links: the section label and, pinned to the panel's right
// edge so it rides along as the panel narrows, the collapse button.
const Head = styled.div`
  position: relative;
  display: none;
  align-items: center;
  flex: none;
  height: ${({ theme }) => theme.space(7)};
  margin-bottom: ${({ theme }) => theme.space(1)};

  p {
    ${type("overline")}
    padding-left: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  ${({ theme }) => theme.media.md} {
    display: flex;
  }
`;

const Toggle = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: ${({ theme }) => theme.space(10)};
  height: ${({ theme }) => theme.space(7)};
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: transparent;
  color: ${({ theme }) => theme.color.fgSubtle};
  font-size: 16px;
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }
`;

const Items = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

// Starts a group of links: its name while the labels show, a hairline in the
// rail. Both are always in the layout, so the links never shift.
const Group = styled.li<{ $collapsed: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-end;
  height: ${({ theme }) => theme.space(8)};
  padding: 0 ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(1.5)};

  span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  &::before {
    content: "";
    position: absolute;
    inset: 50% ${({ theme }) => theme.space(2)} auto;
    height: 1px;
    background: ${({ theme }) => theme.color.line};
  }

  ${({ theme }) => theme.media.md} {
    &::before {
      opacity: ${({ $collapsed }) => ($collapsed ? 1 : 0)};
      transition: opacity ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
    }
  }
`;

const Rule = styled.span`
  display: block;
  height: 1px;
  margin: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2)};
  background: ${({ theme }) => theme.color.line};
`;

// Icon and label keep the same position in both states: the 16px icon sits
// 12px inside a 40px-wide item, which is exactly the rail's inner width.
const row = css`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  height: ${({ theme }) => theme.space(8)};
  padding: 0 ${({ theme }) => theme.space(3)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  .anticon {
    flex: none;
    font-size: 16px;
  }
  /* The global focus ring is an outer shadow, which the rail would clip. */
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }
`;

const Item = styled(Link)<{ $active: boolean }>`
  ${row}
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.accentText : theme.color.fgMuted)};

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.hover)};
    color: ${({ theme, $active }) => ($active ? theme.color.accentText : theme.color.fg)};
  }
`;

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  // Set on the first link of a group, to name it.
  group?: string;
  // Overview matches only its own URL; the rest match any sub-route.
  exact?: boolean;
}

const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

export function Sidebar({
  projectId,
  initialCollapsed = false,
}: {
  projectId: string;
  // The choice the server read from the cookie, to render without a flash.
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const wide = useMediaQuery(`(min-width: ${breakpoint.md}px)`);
  const [collapsed, setStored] = useStoredFlag(SIDEBAR_STORAGE_KEY, false, initialCollapsed);
  // Off until the user toggles, so a restored state does not animate on load.
  const [animate, setAnimate] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl+B");

  const setCollapsed = useCallback(
    (next: boolean) => {
      setAnimate(true);
      setStored(next);
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    },
    [setStored],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the platform is only known in the browser
    if (isApple()) setShortcut("⌘B");
  }, []);

  useEffect(() => {
    if (!wide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || event.shiftKey || event.altKey) return;
      if (!(isApple() ? event.metaKey : event.ctrlKey)) return;
      // Leave Cmd/Ctrl+B to rich-text editors, where it means bold.
      if (event.target instanceof HTMLElement && event.target.isContentEditable) return;
      event.preventDefault();
      setCollapsed(!collapsed);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [wide, collapsed, setCollapsed]);

  const items: NavItem[] = [
    { key: "overview", group: "Build", label: "Overview", href: routes.project(projectId), icon: <AppstoreOutlined />, exact: true },
    { key: "agents", label: "Agents", href: routes.agents(projectId), icon: <RobotOutlined /> },
    { key: "knowledge", label: "Knowledge", href: routes.knowledge(projectId), icon: <ReadOutlined /> },
    { key: "calls", label: "Calls", href: routes.calls(projectId), icon: <PhoneOutlined /> },
    { key: "integrations", group: "Connect", label: "Integrations", href: routes.integrations(projectId), icon: <KeyOutlined /> },
    { key: "api", label: "API", href: routes.projectApi(projectId), icon: <ApiOutlined /> },
    { key: "compliance", group: "Manage", label: "Compliance", href: routes.compliance(projectId), icon: <SafetyCertificateOutlined /> },
    { key: "team", label: "Team", href: routes.team(projectId), icon: <TeamOutlined /> },
    { key: "billing", label: "Billing", href: routes.billing(projectId), icon: <WalletOutlined /> },
    { key: "settings", label: "Settings", href: routes.settings(projectId), icon: <SettingOutlined /> },
  ];

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  // Labels are hidden, so the icons need tooltips.
  const rail = !wide || collapsed;

  return (
    <Slot $collapsed={collapsed}>
      <Aside aria-label="Project" $collapsed={collapsed} $animate={animate}>
        <Head>
          <p aria-hidden className="label">
            Build
          </p>
          {wide && (
            <Tooltip
              title={`${collapsed ? "Expand" : "Collapse"} sidebar (${shortcut})`}
              placement="right"
            >
              <Toggle
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-keyshortcuts="Meta+B Control+B"
                data-tour="sidebar-toggle"
              >
                {collapsed ? <MenuUnfoldOutlined aria-hidden /> : <MenuFoldOutlined aria-hidden />}
              </Toggle>
            </Tooltip>
          )}
        </Head>
        <Items>
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Fragment key={item.key}>
                {item.group && item.key !== "overview" && (
                  <Group aria-hidden $collapsed={collapsed}>
                    <span className="label">{item.group}</span>
                  </Group>
                )}
                {item.key === "settings" && (
                  <li aria-hidden>
                    <Rule />
                  </li>
                )}
                <li>
                <Tooltip title={rail ? item.label : ""} placement="right">
                  <Item
                    href={item.href}
                    $active={active}
                    aria-current={active ? "page" : undefined}
                    data-tour={`nav-${item.key}`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <span className="label">{item.label}</span>
                  </Item>
                </Tooltip>
                </li>
              </Fragment>
            );
          })}
        </Items>
      </Aside>
    </Slot>
  );
}
