import { type FixtureName, FIXTURES } from "@/components/app/integrations/fixtures";
import { Preview } from "@/components/app/integrations/Preview";

// Visual test page for the integrations page, driven by fixtures:
//   /preview/integrations?state=empty|mixed|ready|loading
//   &provider=twilio   opens that provider's panel
//   &public=0          as if the server had no PUBLIC_URL
// In the panel, a key containing "bad" is rejected when tested and one
// containing "offline" cannot be tested.
export default async function IntegrationsPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; provider?: string; public?: string }>;
}) {
  const { state, provider, public: reachable } = await searchParams;
  const name = FIXTURES.find((fixture) => fixture === state) ?? ("mixed" satisfies FixtureName);
  return (
    <Preview
      key={`${name}-${provider}`}
      name={name}
      provider={provider ?? null}
      reachable={reachable !== "0"}
    />
  );
}
