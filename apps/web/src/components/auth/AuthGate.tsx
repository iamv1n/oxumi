"use client";

import { Spin } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import styled from "styled-components";
import { useSession } from "@/lib/api";
import { routes } from "@/lib/routes";
import { ImpersonationBar } from "@/components/admin/ImpersonationBar";

const Centered = styled.div`
  display: grid;
  place-items: center;
  min-height: 100vh;
`;

// Wraps every signed-in page. Signed-out visitors are sent to the login page
// and brought back to where they were going afterwards.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = !isLoading && !error && user === null;

  useEffect(() => {
    if (signedOut)
      router.replace(`${routes.login}?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  if (error) return <Centered>{error.message}</Centered>;
  if (!user) {
    return (
      <Centered>
        <Spin size="large" />
      </Centered>
    );
  }
  return (
    <>
      {children}
      <ImpersonationBar />
    </>
  );
}
