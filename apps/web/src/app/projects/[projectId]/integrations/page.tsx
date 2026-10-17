"use client";

import { Skeleton } from "antd";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoadError } from "@/components/app/agents/states";
import { Integrations, INTEGRATIONS_GUIDE } from "@/components/app/integrations/Integrations";
import { Page, PageHeader, Panel } from "@/components/app/kit";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { useAgents, useCredentials, useHealth } from "@/lib/api";

// Where a project connects its own provider keys. `?provider=twilio` opens
// that provider's panel, so other pages can link straight to it.
function Body() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const credentials = useCredentials(projectId);
  const health = useHealth(projectId);
  const agents = useAgents(projectId);

  const open = (provider: string | null) => {
    const next = new URLSearchParams(query);
    if (provider) next.set("provider", provider);
    else next.delete("provider");
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  if (credentials.data)
    return (
      <Integrations
        projectId={projectId}
        credentials={credentials.data}
        health={health.data}
        agents={agents.data}
        openProvider={query.get("provider")}
        onOpenProvider={open}
      />
    );
  if (credentials.error)
    return (
      <LoadError
        title={
          credentials.error.status === 403
            ? "You cannot see this project's integrations"
            : "Integrations could not be loaded"
        }
        error={credentials.error}
        onRetry={() => void credentials.mutate()}
      />
    );
  return <Loading />;
}

// Shaped like the page it stands in for, so nothing jumps when it arrives.
function Loading() {
  return (
    <div aria-busy aria-label="Loading integrations" style={{ display: "grid", gap: 12 }}>
      {[3, 3, 2, 2].map((rows, index) => (
        <Panel key={index}>
          <Skeleton active title={false} paragraph={{ rows }} />
        </Panel>
      ))}
    </div>
  );
}

export default function IntegrationsPage() {
  // Replayed from the top bar's Guide button; it does not start by itself.
  usePageGuide(INTEGRATIONS_GUIDE);

  return (
    <Page>
      <PageHeader
        title="Integrations"
        description="Connect this project to the providers its agents think, speak and place calls with, using your own keys."
      />
      <Suspense fallback={<Loading />}>
        <Body />
      </Suspense>
    </Page>
  );
}
