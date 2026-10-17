import FinalCta from "@/components/landing/closing/FinalCta";
import UseCasesFull from "@/components/landing/closing/UseCasesFull";
import { PageIntro } from "@/components/landing/structure";

export const metadata = { title: "Use cases · Oxumi" };

export default function UseCasesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Use cases"
        title="Any call your team repeats."
        lede="If the conversation follows a pattern, an agent can make it and bring the answers back."
      />
      <UseCasesFull />
      <FinalCta compact />
    </>
  );
}
