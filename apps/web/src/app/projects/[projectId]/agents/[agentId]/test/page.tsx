"use client";

import { useParams } from "next/navigation";
import { TestCall } from "@/components/app/test-call";
import { TEST_GUIDE } from "@/components/app/test-call/guide";
import { usePageGuide } from "@/components/onboarding/OnboardingProvider";

export default function TestCallPage() {
  const { projectId, agentId } = useParams<{ projectId: string; agentId: string }>();
  usePageGuide(TEST_GUIDE);
  // Keyed by agent so switching agents starts from a clean console.
  return <TestCall key={agentId} projectId={projectId} agentId={agentId} />;
}
