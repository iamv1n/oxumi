import FinalCta from "@/components/landing/closing/FinalCta";
import ProductPrinciples from "@/components/landing/closing/ProductPrinciples";
import ProductQuestions from "@/components/landing/closing/ProductQuestions";
import { PageIntro } from "@/components/landing/structure";
import ProductFlow from "@/components/landing/story/ProductFlow";

export const metadata = { title: "Product · Oxumi" };

export default function ProductPage() {
  return (
    <>
      <PageIntro
        eyebrow="Product"
        title="From a drawing to a finished call."
        lede="How a call is designed, run and turned into data you can rely on."
      />
      <ProductFlow />
      <ProductPrinciples />
      <ProductQuestions />
      <FinalCta compact />
    </>
  );
}
