"use client";

import type { ComponentProps } from "react";
import { SamplePanel } from "../SamplePanel";

// SamplePanel as the docs use it in the code column: the language is chosen
// in the toolbar, and long responses are shortened with a "show all" control.
export function Sample(props: ComponentProps<typeof SamplePanel>) {
  return <SamplePanel picker={false} clip={8} {...props} />;
}
