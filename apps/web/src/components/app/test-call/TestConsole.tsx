"use client";

import { useState } from "react";
import styled from "styled-components";
import { RAIL, WIDE } from "./Collapsible";
import { Conversation } from "./Conversation";
import { useConsoleLayout } from "./layout";
import { LivePanel } from "./LivePanel";
import type { ConsoleProps } from "./parts";
import { PhoneDialog } from "./PhoneDialog";
import type { Mode } from "./state";
import { SetupPanel } from "./SetupPanel";

// Fills the height it is given (the agent layout's scroll container). The
// layout follows the console's own width, not the viewport's: the app sidebar
// and both side panels can be collapsed, so no outer width can be assumed.
export const ConsoleRoot = styled.div`
  container-type: inline-size;
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: ${({ theme }) => theme.color.canvas};

  /* Rendered without a layout around it: take the whole window. */
  .ant-app > & {
    height: 100dvh;
  }
`;

const Zones = styled.div<{ $setup: boolean; $live: boolean; $callFirst: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  /* Stacked: one scrolling column; the conversation leads once a call is on. */
  > main {
    height: min(78dvh, 720px);
    min-height: 420px;
    order: ${({ $callFirst }) => ($callFirst ? -1 : 0)};
    border-block: 1px solid ${({ theme }) => theme.color.line};
  }

  @container (min-width: ${WIDE}) {
    height: 100%;
    grid-template-columns:
      ${({ $setup }) => ($setup ? "300px" : RAIL)}
      minmax(0, 1fr)
      ${({ $live }) => ($live ? "320px" : RAIL)};
    grid-template-rows: minmax(0, 1fr);
    transition: grid-template-columns ${({ theme }) => theme.motion.base}
      ${({ theme }) => theme.motion.ease};

    > main {
      height: auto;
      min-height: 0;
      order: 0;
      border-block: 0;
      border-inline: 1px solid ${({ theme }) => theme.color.line};
    }
  }
`;

// The whole test console: setup, conversation, live state.
export function TestConsole(outer: ConsoleProps) {
  const [layout, setLayout] = useConsoleLayout();
  // "Call a phone" (and "Dial again") never dial directly: they open the
  // dialog, and only its confirm button places the call.
  const [dialling, setDialling] = useState(false);
  const { onStart } = outer;
  const props: ConsoleProps = {
    ...outer,
    onStart: (mode: Mode) => (mode === "phone" ? setDialling(true) : onStart(mode)),
  };
  const live = props.state.status === "live";

  // Setup gets out of the way while a call is live and comes back when it
  // ends. Opening it mid-call lasts for that call only; the saved preference
  // is the one for when no call is running.
  const [duringCall, setDuringCall] = useState<boolean | null>(null);
  const [wasLive, setWasLive] = useState(live);
  if (wasLive !== live) {
    setWasLive(live);
    setDuringCall(null);
  }
  const setupOpen = live ? (duringCall ?? false) : layout.setup;
  const toggleSetup = () =>
    live ? setDuringCall(!setupOpen) : setLayout("setup", !layout.setup);

  return (
    <ConsoleRoot>
      <Zones $setup={setupOpen} $live={layout.live} $callFirst={props.state.status !== "idle"}>
        <SetupPanel {...props} open={setupOpen} onToggle={toggleSetup} />
        <Conversation {...props} />
        <LivePanel
          {...props}
          open={layout.live}
          onToggle={() => setLayout("live", !layout.live)}
          layout={layout}
          onLayout={setLayout}
        />
      </Zones>
      <PhoneDialog
        {...outer}
        open={dialling}
        onClose={() => setDialling(false)}
        onCall={() => {
          setDialling(false);
          onStart("phone");
        }}
      />
    </ConsoleRoot>
  );
}
