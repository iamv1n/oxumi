"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Skeleton } from "antd";
import Link from "next/link";
import styled from "styled-components";
import { AccountNav } from "@/components/app/account/AccountNav";
import {
  AppearanceSection,
  DangerSection,
  EmailSection,
  PasswordSection,
  ProfileSection,
  SessionSection,
} from "@/components/app/account/AccountSections";
import { ACCOUNT_GUIDE } from "@/components/app/account/guide";
import { Page, PageHeader, Panel } from "@/components/app/kit";
import { LoadError } from "@/components/app/projects/LoadError";
import { TopBar } from "@/components/app/shell/TopBar";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import { useSession } from "@/lib/api";
import { routes } from "@/lib/routes";

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

const Back = styled(Link)`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};

  &:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(6)};
  align-items: start;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: 168px minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(6)};
  }
`;

const Sections = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  min-width: 0;
  max-width: 860px;

  /* Land a linked section below the sticky top bar (and the tab strip). */
  > section {
    scroll-margin-top: calc(
      ${({ theme }) => theme.layout.topbar} + ${({ theme }) => theme.space(16)}
    );
  }
  ${({ theme }) => theme.media.md} {
    > section {
      scroll-margin-top: calc(
        ${({ theme }) => theme.layout.topbar} + ${({ theme }) => theme.space(5)}
      );
    }
  }
`;

export default function AccountPage() {
  const { user, error, isLoading } = useSession();
  usePageGuide(ACCOUNT_GUIDE);

  return (
    <Frame>
      <Sticky>
        <TopBar />
      </Sticky>
      <main>
        <Page>
          <Back href={routes.projects}>
            <ArrowLeftOutlined aria-hidden />
            Projects
          </Back>
          <PageHeader
            title="Account"
            description="Your profile, sign-in details, appearance and account deletion. These apply to you, not to a project."
          />
          {user ? (
            <Layout>
              <AccountNav />
              <Sections>
                <ProfileSection user={user} />
                <EmailSection user={user} />
                <PasswordSection />
                <AppearanceSection />
                <SessionSection user={user} />
                <DangerSection user={user} />
              </Sections>
            </Layout>
          ) : error ? (
            <LoadError error={error} what="your account" />
          ) : (
            <Sections aria-busy={isLoading} aria-label="Loading account">
              {[3, 2, 3].map((rows, i) => (
                <Panel key={i}>
                  <Skeleton active paragraph={{ rows }} />
                </Panel>
              ))}
            </Sections>
          )}
        </Page>
      </main>
    </Frame>
  );
}
