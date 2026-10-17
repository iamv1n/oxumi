import { ExampleLanguageProvider } from "@/components/landing/language";
import ClosingBlock from "@/components/landing/closing";

export default function Preview() {
  return (
    <ExampleLanguageProvider>
      <ClosingBlock />
    </ExampleLanguageProvider>
  );
}
