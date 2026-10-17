import AboutValues from "@/components/landing/closing/AboutValues";
import { PageIntro } from "@/components/landing/structure";

export const metadata = { title: "About · Oxumi" };

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="Routine calls, made well."
        lede="Why this exists, and the rules it is built to keep."
      />
      <AboutValues />
    </>
  );
}
