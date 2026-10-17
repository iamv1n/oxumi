"use client";

import { Alert, Button, Skeleton, Spin } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { LinkButton } from "@/components/app/projects/LinkButton";
import AuthLayout from "@/components/auth/AuthLayout";
import { type } from "@oxumi/ui/design/typography";
import { acceptInvite, ApiError, logout, previewInvite, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";
import { ROLE } from "./roles";

const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  .ant-btn,
  && a {
    width: 100%;
    height: 44px;
    font-size: 0.9375rem;
  }
`;

const RoleNote = styled.p`
  ${type("body")}
  margin-bottom: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fgMuted};

  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Centered = styled.div`
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space(6)};
`;

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

// The page an invitation email links to. Works signed out: it says what the
// invitation is for, then asks the person to sign in (or sign up) with the
// invited address and come back here to accept.
export function InviteView() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { user, isLoading: sessionLoading } = useSession();
  const preview = useSWR(token ? ["invite", token] : null, () => previewInvite(token), {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const here = routes.invite(token);
  const loginHref = `${routes.login}?next=${encodeURIComponent(here)}`;
  const signupHref = `${routes.signup}?next=${encodeURIComponent(here)}`;
  const back = <Link href={user ? routes.projects : routes.login}>{user ? "Go to your projects" : "Sign in"}</Link>;

  if (!token)
    return (
      <AuthLayout
        eyebrow="Invitation"
        title="Link incomplete"
        description="This invitation link is missing its code. Open it again from the email, or ask for a new one."
        footer={back}
      >
        {null}
      </AuthLayout>
    );

  if (preview.error) {
    const err = preview.error as ApiError;
    const title =
      err.status === 410
        ? "Invitation expired"
        : err.status === 404
          ? "Invitation not valid"
          : "Couldn't open the invitation";
    const description =
      err.status === 410
        ? "Invitations last 7 days. Ask someone on the project to send you a new one."
        : err.status === 404
          ? "It may have been revoked or already used. Ask someone on the project for a new one."
          : err.message;
    return (
      <AuthLayout eyebrow="Invitation" title={title} description={description} footer={back}>
        {err.status !== 404 && err.status !== 410 && (
          <Actions>
            <Button onClick={() => void preview.mutate()}>Try again</Button>
          </Actions>
        )}
      </AuthLayout>
    );
  }

  if (!preview.data)
    return (
      <AuthLayout eyebrow="Invitation" title="Opening invitation" description="One moment…">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </AuthLayout>
    );

  const { projectName, email, role } = preview.data;
  const roleName = ROLE[role]?.label.toLowerCase() ?? role;
  const wrongAccount = user && user.email.toLowerCase() !== email.toLowerCase();

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const { projectId } = await acceptInvite(token);
      router.push(routes.project(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the invitation.");
      setBusy(false);
    }
  };

  // Signs out of the wrong account, then signs in with the invited one.
  const switchAccount = async () => {
    setBusy(true);
    try {
      await logout();
      router.push(loginHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Invitation"
      title={`Join ${projectName}`}
      description={
        <>
          You have been invited to join <strong>{projectName}</strong> as {article(roleName)}{" "}
          <strong>{roleName}</strong>. The invitation is for <strong>{email}</strong>.
        </>
      }
    >
      {ROLE[role] && (
        <RoleNote>
          <b>{ROLE[role].label}:</b> {ROLE[role].description}
        </RoleNote>
      )}
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 20 }} />}
      {sessionLoading ? (
        <Centered>
          <Spin />
        </Centered>
      ) : !user ? (
        <Actions>
          <LinkButton href={loginHref} $variant="primary">
            Sign in to accept
          </LinkButton>
          <LinkButton href={signupHref}>Create an account</LinkButton>
        </Actions>
      ) : wrongAccount ? (
        <>
          <Alert
            type="warning"
            showIcon
            title={`You're signed in as ${user.email}`}
            description={`This invitation is for ${email}. Sign in with that address to accept it.`}
            style={{ marginBottom: 20 }}
          />
          <Actions>
            <Button type="primary" block loading={busy} onClick={() => void switchAccount()}>
              Sign in as {email}
            </Button>
          </Actions>
        </>
      ) : (
        <Actions>
          <Button type="primary" block loading={busy} onClick={() => void accept()}>
            Accept and open {projectName}
          </Button>
        </Actions>
      )}
    </AuthLayout>
  );
}
