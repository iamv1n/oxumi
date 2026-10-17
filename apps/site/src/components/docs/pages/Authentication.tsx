"use client";

import Link from "next/link";
import { CodeBlock } from "@oxumi/ui/docs/CodeBlock";
import { Article, C, Facts, List, Note, P, PageTitle, Section } from "../ui";
import { Sample } from "./Sample";
import { routes } from "@/lib/routes";

export default function Authentication() {
  return (
    <Article>
      <PageTitle kicker="Get started · 2 of 4" title="Authentication">
        Every request carries a project API key as a bearer token. Keys are created, rotated and
        revoked in the app; the API has no endpoints for managing them.
      </PageTitle>

      <Section id="sending" title="Sending the key" aside={<Sample topic="authenticate" />}>
        <P>
          Send the key in the <C>Authorization</C> header with the scheme <C>Bearer</C>. The
          samples read it from an environment variable, <C>OXUMI_API_KEY</C>.
        </P>
        <CodeBlock title="Header" language="http" code={"Authorization: Bearer ox_live_…"} />
        <P>
          A request with no header, another scheme, an unknown key, an expired key or a revoked
          key gets the same <C>401</C>. The body does not say which it was.
        </P>
      </Section>

      <Section
        id="keys"
        title="API keys"
        aside={
          <Facts
            title="A key"
            rows={[
              ["Format", "ox_live_ followed by 43 characters"],
              ["Shown", "Once, when it is created"],
              ["Stored", "As a hash; it cannot be shown again"],
              ["Listed as", "Its first 16 characters, e.g. ox_live_a0P82HHa…"],
              ["Scope", "One project: its agents and its calls"],
              ["Expiry", "Optional, 1 to 3,650 days from creation"],
              ["Limit", "20 working keys per project"],
            ]}
          />
        }
      >
        <P>
          Create a key on a project&apos;s API page: <Link href={routes.projects}>open your projects</Link>
          , choose a project, then <strong>API → API keys</strong>. Copy it straight away; it is
          displayed only at that moment.
        </P>
        <P>
          A key without an expiry works until it is rotated or revoked. A working key is one
          that is active or expiring.
        </P>
      </Section>

      <Section
        id="statuses"
        title="Key statuses"
        aside={
          <Facts
            title="Status → accepted?"
            rows={[
              ["active", "Yes. In normal use."],
              ["expiring", "Yes. Rotated; works until its grace period ends."],
              ["expired", "No. Its expiry time has passed."],
              ["revoked", "No. Switched off by hand; cannot be undone."],
            ]}
          />
        }
      >
        <P>
          The app shows one of four statuses for each key. Only the first two are accepted by
          the API.
        </P>
      </Section>

      <Section
        id="rotation"
        title="Rotating a key"
        aside={
          <Facts
            title="Rotation"
            rows={[
              ["Grace period", "24 hours unless you choose otherwise"],
              ["Range", "0 to 168 hours. 0 stops the old key at once."],
              ["Old key", "expiring during the grace period, then expired"],
              ["New key", "Same name, no expiry"],
              ["Allowed for", "Active keys only"],
            ]}
          />
        }
      >
        <P>
          Rotating issues a replacement and keeps the old key working for a grace period, so a
          live integration can be switched over without downtime.
        </P>
        <List>
          <li>
            If the old key was already due to expire sooner than the grace period, the earlier
            time stands.
          </li>
          <li>
            Revoking is different: the key stops working immediately and there is no
            replacement.
          </li>
        </List>
      </Section>

      <Section
        id="server-side"
        title="Keep keys on your server"
        aside={
          <CodeBlock
            title="Set the key for the samples"
            language="bash"
            code={'export OXUMI_API_KEY="ox_live_…"'}
          />
        }
      >
        <List>
          <li>Read the key from configuration or a secret store, never from source code.</li>
          <li>
            Never put a key in a web page or a mobile app. Anyone holding it can place calls
            from your project.
          </li>
          <li>
            Use one key per system that connects. The app shows when each key was last used and
            how many requests it made.
          </li>
        </List>
        <Note title="Browsers cannot call the API">
          <p>
            The API answers cross-origin requests only from the Oxumi app itself. Call it
            from your back end.
          </p>
        </Note>
      </Section>
    </Article>
  );
}
