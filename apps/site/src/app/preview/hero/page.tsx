import { ExampleLanguageProvider } from "@/components/landing/language";
import HeroBlock from "@/components/landing/hero";

export default function Preview() {
  return (
    <ExampleLanguageProvider>
      <HeroBlock />
    </ExampleLanguageProvider>
  );
}
