"use client";

import { SettingOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { routes } from "@/lib/routes";
import { LinkButton } from "../projects/LinkButton";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

// The frame around every page of a project: top bar, sidebar and a main
// region that is exactly the rest of the viewport. Pages bring their own
// padding (kit `Page`); the flow builder uses the area edge to edge.

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${({ theme }) => theme.color.canvas};
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  height: calc(100vh - ${({ theme }) => theme.layout.topbar});
  overflow: auto;

  &:focus {
    outline: none;
    box-shadow: none;
  }
`;

const SkipLink = styled.a`
  ${type("label")}
  position: absolute;
  top: ${({ theme }) => theme.space(2)};
  left: ${({ theme }) => theme.space(2)};
  z-index: 100;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentFg};
  transform: translateY(-200%);

  &:focus {
    transform: none;
  }
`;

export function AppShell({
  children,
  sidebarCollapsed = false,
}: {
  children: ReactNode;
  // The sidebar state remembered in the cookie, for the first render.
  sidebarCollapsed?: boolean;
}) {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <Frame>
      <SkipLink href="#main">Skip to content</SkipLink>
      <TopBar
        context={<ProjectSwitcher projectId={projectId} />}
        actions={
          <Tooltip title="Project settings" placement="bottomRight">
            <LinkButton
              href={routes.settings(projectId)}
              $variant="text"
              $square
              aria-label="Project settings"
            >
              <SettingOutlined aria-hidden />
            </LinkButton>
          </Tooltip>
        }
      />
      <Body>
        <Sidebar projectId={projectId} initialCollapsed={sidebarCollapsed} />
        <Main id="main" tabIndex={-1}>
          {children}
        </Main>
      </Body>
    </Frame>
  );
}
