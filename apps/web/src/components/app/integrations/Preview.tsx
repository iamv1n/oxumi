"use client";

import { Skeleton } from "antd";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Page, PageHeader, Panel } from "@/components/app/kit";
import { ApiError, type Credential } from "@/lib/api";
import {
  fixtureAgents,
  fixtureCredentials,
  fixtureHealth,
  type FixtureName,
  fixtureVerdict,
  withMissing,
} from "./fixtures";
import { Integrations } from "./Integrations";
import type { Actions } from "./model";

// The integrations page over hand-written states, with a pretend server:
// saving and testing change the data on screen and nothing else.
export function Preview({
  name,
  provider,
  reachable,
}: {
  name: FixtureName;
  provider: string | null;
  reachable: boolean;
}) {
  const [credentials, setCredentials] = useState<Credential[]>(() =>
    fixtureCredentials(name === "loading" ? "empty" : name),
  );
  const [open, setOpen] = useState<string | null>(provider);
  // The fixtures hold times relative to now, so they are drawn in the browser
  // only; a server render would disagree with it by the time it arrived.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // What the last saved key would do when tested.
  const verdicts = useRef<Record<string, string>>({});
  const wait = () => new Promise((resolve) => setTimeout(resolve, 500));
  const patch = (id: string, change: (credential: Credential) => Omit<Credential, "missing">) =>
    setCredentials((all) => all.map((c) => (c.provider === id ? withMissing(change(c)) : c)));

  const actions = useMemo<Actions>(
    () => ({
      save: async (id, input) => {
        await wait();
        if (input.secret) verdicts.current[id] = fixtureVerdict(input.secret);
        patch(id, (c) => ({
          ...c,
          source: "project",
          options: input.options,
          updatedAt: new Date().toISOString(),
          ...(input.secret
            ? { hint: `…${input.secret.slice(-4)}`, verifiedAt: null, verifyError: null }
            : {}),
        }));
      },
      verify: async (id) => {
        await wait();
        const verdict = verdicts.current[id] ?? "ok";
        if (verdict === "offline") throw new ApiError("Cannot reach the API.", 0);
        const error = verdict === "rejected" ? "The provider rejected this key." : null;
        patch(id, (c) => ({
          ...c,
          verifiedAt: error ? null : new Date().toISOString(),
          verifyError: error,
          updatedAt: new Date().toISOString(),
        }));
        return { ok: error === null, error };
      },
      remove: async (id) => {
        await wait();
        patch(id, (c) => ({
          ...c,
          source: null,
          hint: null,
          options: {},
          verifiedAt: null,
          verifyError: null,
          updatedAt: null,
        }));
      },
    }),
    [],
  );

  return (
    <Page>
      <PageHeader
        title="Integrations"
        description="Connect this project to the providers its agents think, speak and place calls with, using your own keys."
      />
      {name === "loading" || !mounted ? (
        <div aria-busy style={{ display: "grid", gap: 12 }}>
          {[3, 3, 2, 2].map((rows, index) => (
            <Panel key={index}>
              <Skeleton active title={false} paragraph={{ rows }} />
            </Panel>
          ))}
        </div>
      ) : (
        <Integrations
          projectId="preview-project"
          credentials={credentials}
          health={fixtureHealth(credentials, reachable)}
          agents={fixtureAgents}
          openProvider={open}
          onOpenProvider={setOpen}
          actions={actions}
        />
      )}
    </Page>
  );
}
