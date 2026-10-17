"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, impersonate } from "@/lib/api";
import { routes } from "@/lib/routes";

// Signs in as a user, then opens `path` (their projects by default) as them.
export function useImpersonate() {
  const router = useRouter();
  const { message } = App.useApp();
  const [pending, setPending] = useState<string | null>(null);

  const start = async (userId: string, path: string = routes.projects) => {
    setPending(userId);
    try {
      const user = await impersonate(userId);
      message.success(`Signed in as ${user.email}.`);
      router.push(path);
    } catch (err) {
      setPending(null);
      message.error(err instanceof ApiError ? err.message : "Could not sign in as this user.");
    }
  };

  return { start, pending };
}
