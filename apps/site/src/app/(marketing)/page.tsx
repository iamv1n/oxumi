import FinalCta from "@/components/landing/closing/FinalCta";
import HomeLanguages from "@/components/landing/closing/HomeLanguages";
import HomeUseCases from "@/components/landing/closing/HomeUseCases";
import HomeWhy from "@/components/landing/closing/HomeWhy";
import HomeHero from "@/components/landing/hero/HomeHero";
import HomeDemo from "@/components/landing/story/HomeDemo";
import HomeHow from "@/components/landing/story/HomeHow";

// Home makes one argument, once: what it is, proof that it works, how it
// works in brief, who it is for, why to trust it. Depth lives on /product
// and /use-cases.
export default function Home() {
  return (
    <>
      <HomeHero />
      <HomeDemo />
      <HomeHow />
      <HomeLanguages />
      <HomeUseCases />
      <HomeWhy />
      <FinalCta />
    </>
  );
}
