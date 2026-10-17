import { ExampleLanguageProvider } from "@/components/landing/language";
import StoryBlock from "@/components/landing/story";

export default function Preview() {
  return (
    <ExampleLanguageProvider>
      <StoryBlock />
    </ExampleLanguageProvider>
  );
}
