"use client";

import {
  LogoutOutlined,
  RollbackOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { App, Dropdown, Skeleton } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { ApiError, logout, stopImpersonating, useSession, type User } from "@/lib/api";
import { routes } from "@/lib/routes";

// The signed-in account, at the right end of the top bar: who you are, and
// the way out.

const Avatar = styled.button<{ $open: boolean }>`
  ${type("caption")}
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ theme }) => theme.space(8)};
  height: ${({ theme }) => theme.space(8)};
  margin-left: ${({ theme }) => theme.space(1)};
  padding: 0;
  border: 1px solid
    ${({ theme, $open }) => ($open ? theme.color.accentLine : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.overlay};
  color: ${({ theme }) => theme.color.fg};
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    border-color: ${({ theme }) => theme.color.accentLine};
  }
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-width: 280px;
  padding: ${({ theme }) => theme.space(1)} 0;
  cursor: default;

  strong {
    ${type("label")}
    overflow: hidden;
    color: ${({ theme }) => theme.color.fg};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    ${type("caption")}
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

// "Asha Verma" -> "AV"; falls back to the email's first letter.
export function initials(user: Pick<User, "name" | "email">): string {
  const words = user.name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]!.charAt(0)}${words[words.length - 1]!.charAt(0)}`
      : (words[0] ?? user.email).slice(0, 2);
  return letters.toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, isLoading } = useSession();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!user) {
    return isLoading ? <Skeleton.Avatar active size={32} /> : null;
  }

  const signOut = async () => {
    setLeaving(true);
    try {
      await logout();
      router.replace(routes.login);
    } catch (err) {
      setLeaving(false);
      message.error(err instanceof ApiError ? err.message : "Could not log out.");
    }
  };

  const returnToAdmin = async () => {
    setLeaving(true);
    try {
      const id = await stopImpersonating();
      router.replace(id ? routes.adminUser(id) : routes.admin);
    } catch (err) {
      setLeaving(false);
      message.error(err instanceof ApiError ? err.message : "Could not return to your account.");
    }
  };

  const displayName = user.name.trim() || user.email;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: "identity",
            type: "group",
            label: (
              <Identity>
                <strong>{displayName}</strong>
                {displayName !== user.email && <span>{user.email}</span>}
              </Identity>
            ),
          },
          { type: "divider" },
          ...(user.role === "admin" && !user.impersonator
            ? [
                {
                  key: "admin",
                  icon: <SafetyOutlined />,
                  label: <Link href={routes.admin}>Admin console</Link>,
                },
              ]
            : []),
          ...(user.impersonator
            ? [
                {
                  key: "return",
                  icon: <RollbackOutlined />,
                  label: "Return to admin",
                  disabled: leaving,
                  onClick: () => void returnToAdmin(),
                },
              ]
            : []),
          {
            key: "account",
            icon: <UserOutlined />,
            label: <Link href={routes.account}>Account settings</Link>,
          },
          {
            key: "logout",
            icon: <LogoutOutlined />,
            label: "Log out",
            disabled: leaving,
            onClick: () => void signOut(),
          },
        ],
      }}
    >
      <Avatar
        type="button"
        $open={open}
        aria-label={`Account: ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials(user)}
      </Avatar>
    </Dropdown>
  );
}
