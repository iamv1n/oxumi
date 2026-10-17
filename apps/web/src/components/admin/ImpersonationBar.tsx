"use client";

import { EyeOutlined, RollbackOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { ApiError, stopImpersonating, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";

// Floats over every signed-in page while an admin is acting as someone else,
// so it is never mistaken for their own account. Fixed, so it changes no
// page's layout.

const Bar = styled.div`
  ${type("label")}
  position: fixed;
  bottom: ${({ theme }) => theme.space(4)};
  left: 50%;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  max-width: calc(100vw - ${({ theme }) => theme.space(8)});
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2)}
    ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.warning};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  color: ${({ theme }) => theme.color.fg};
  transform: translateX(-50%);

  .anticon {
    color: ${({ theme }) => theme.color.warning};
  }
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b {
    font-weight: 600;
  }
`;

export function ImpersonationBar() {
  const { user } = useSession();
  const router = useRouter();
  const { message } = App.useApp();
  const [leaving, setLeaving] = useState(false);

  if (!user?.impersonator) return null;

  const leave = async () => {
    setLeaving(true);
    try {
      const id = await stopImpersonating();
      router.replace(id ? routes.adminUser(id) : routes.admin);
    } catch (err) {
      setLeaving(false);
      message.error(err instanceof ApiError ? err.message : "Could not return to your account.");
      if (err instanceof ApiError && err.status === 401) router.replace(routes.login);
    }
  };

  return (
    <Bar role="status">
      <EyeOutlined aria-hidden />
      <span>
        Viewing as <b>{user.name || user.email}</b> ({user.email})
      </span>
      <Button
        size="small"
        shape="round"
        icon={<RollbackOutlined />}
        loading={leaving}
        onClick={() => void leave()}
      >
        Return to admin
      </Button>
    </Bar>
  );
}
