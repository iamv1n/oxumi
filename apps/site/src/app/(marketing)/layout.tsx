import type { ReactNode } from "react";
import SiteFooter from "@/components/landing/closing/SiteFooter";
import SiteNav from "@/components/landing/hero/SiteNav";
import { ExampleLanguageProvider } from "@/components/landing/language";

// The public site: every marketing page shares one nav and one footer, and
// one choice of language for the example calls.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <ExampleLanguageProvider>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </ExampleLanguageProvider>
  );
}
