"use client";

import { SafetyOutlined } from "@ant-design/icons";
import { Button, Spin, Tabs } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import styled from "styled-components";
import { Empty, Page } from "@/components/app/kit";
import { TopBar } from "@/components/app/shell/TopBar";
import { type } from "@oxumi/ui/design/typography";
import { useSession } from "@/lib/api";
import { routes } from "@/lib/routes";

// The frame around every admin page: the top bar marked "Admin", tabs for the
// console's sections, and the admins-only check.

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.color.canvas};
`;

const Sticky = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
`;

const Badge = styled.span`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fg};

  .anticon {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Centered = styled.div`
  display: grid;
  place-items: center;
  min-height: 50vh;
`;

const SECTIONS = [
  { key: routes.admin, label: "Users" },
  { key: routes.adminProjects, label: "Projects" },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = user?.role === "admin" && !user.impersonator;
  const active = SECTIONS.find((s) => s.key === pathname)?.key ?? routes.admin;

  let body: ReactNode;
  if (!user) {
    body = (
      <Centered>
        <Spin />
      </Centered>
    );
  } else if (!isAdmin) {
    body = (
      <Empty
        icon={<SafetyOutlined />}
        title="Admins only"
        description={
          user.impersonator
            ? "You're signed in as another user. Return to your own account to use the admin console."
            : "Your account doesn't have access to the admin console."
        }
        action={
          <Link href={routes.projects}>
            <Button>Back to projects</Button>
          </Link>
        }
      />
    );
  } else {
    body = (
      <>
        <Tabs
          activeKey={active}
          onChange={(key) => router.push(key)}
          items={SECTIONS.map((s) => ({ key: s.key, label: s.label }))}
        />
        {children}
      </>
    );
  }

  return (
    <Frame>
      <Sticky>
        <TopBar
          guide={false}
          context={
            <Badge>
              <SafetyOutlined aria-hidden />
              Admin
            </Badge>
          }
        />
      </Sticky>
      <main>
        <Page>{body}</Page>
      </main>
    </Frame>
  );
}
