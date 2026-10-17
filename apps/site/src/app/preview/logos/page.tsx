import type { Metadata } from "next";
import LogoConcepts from "@/components/brand/concepts/LogoConcepts";

export const metadata: Metadata = { title: "Logo concepts · Oxumi" };

// Five logo concepts side by side, for choosing between.
export default function LogoConceptsPage() {
  return <LogoConcepts />;
}
