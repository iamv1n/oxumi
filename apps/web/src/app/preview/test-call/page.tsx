import { type FixtureName, FIXTURES } from "@/components/app/test-call/fixtures";
import { Preview } from "@/components/app/test-call/Preview";

// Visual test page for the agent Test tab, driven by fixtures instead of a
// live call:
//   /preview/test-call?state=idle|connecting|live|live-text|ended|hangup|
//                      error|error-voice|error-dropped|not-ready
//   &width=1208  constrains the console to a width (as inside the app shell)
//   &bar=0       hides the state switcher
export default async function TestCallPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; width?: string; bar?: string }>;
}) {
  const { state, width, bar } = await searchParams;
  const name = FIXTURES.find((fixture) => fixture === state) ?? ("idle" satisfies FixtureName);
  return (
    <Preview key={name} name={name} width={Number(width) || undefined} bar={bar !== "0"} />
  );
}
