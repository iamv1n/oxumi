import { Container, Section } from "@/components/landing/kit";
import { MoreLink, PageIntro } from "@/components/landing/structure";

export const metadata = { title: "Early access · Oxumi" };

// Where the site's links to the app lead when the site is built without an
// app to send people to (no NEXT_PUBLIC_APP_URL; see lib/app-url.ts and the
// redirects in next.config.ts).
export default function EarlyAccessPage() {
  return (
    <>
      <PageIntro
        eyebrow="Early access"
        title="Sign-ups are not open yet."
        lede="Oxumi is in early build. Accounts open here soon; until then you can see how a call is designed and read the API."
      />
      <Section>
        <Container style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <MoreLink href="/product">How it works</MoreLink>
          <MoreLink href="/use-cases">Use cases</MoreLink>
          <MoreLink href="/docs">API docs</MoreLink>
        </Container>
      </Section>
    </>
  );
}
