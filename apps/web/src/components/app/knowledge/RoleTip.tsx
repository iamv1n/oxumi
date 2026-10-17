"use client";

import { Tooltip } from "antd";
import type { ReactNode } from "react";

// Wraps a control the person's role cannot use, and says which role can.
// The span lets the tooltip show over a disabled button.
export function RoleTip({
  allowed,
  title,
  children,
}: {
  allowed: boolean;
  // e.g. "Editors and above can add sources".
  title: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    <Tooltip title={title}>
      <span style={{ display: "inline-flex" }}>{children}</span>
    </Tooltip>
  );
}
