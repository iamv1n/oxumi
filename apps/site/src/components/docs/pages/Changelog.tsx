"use client";

import Link from "next/link";
import { Article, C, Cards, Facts, List, P, PageTitle, Section } from "../ui";

export default function Changelog() {
  return (
    <Article>
      <PageTitle kicker="Reference" title="Versioning">
        The API is at version 1 and Oxumi is an early build. This page says plainly what that
        means for anything you build on it.
      </PageTitle>

      <Section
        id="versioning"
        title="How the API is versioned"
        aside={
          <Facts
            title="Version"
            rows={[
              ["Current", "v1, the only version"],
              ["Where", "In the path: every endpoint starts with /v1"],
              ["Version header", "None"],
              ["Stability", "Early build; may still change"],
              ["Deprecation policy", "None yet"],
              ["Signature scheme", "v1, named in Oxumi-Signature"],
            ]}
          />
        }
      >
        <P>
          The version is part of the path. There is no version header and there are no dated
          versions.
        </P>
        <List>
          <li>
            <strong>It is not frozen.</strong> While the product is in early build, endpoints
            and fields may still change, including in ways that break existing code. There is
            no notice period yet.
          </li>
          <li>
            <strong>Write tolerant clients.</strong> Ignore fields you do not recognise, do not
            depend on the order of keys, and branch on HTTP status instead of message text.
          </li>
          <li>
            <strong>Webhook signatures carry their own version.</strong> The <C>v1=</C> in{" "}
            <C>Oxumi-Signature</C> names the signing scheme, independently of the API
            version.
          </li>
        </List>
      </Section>

      <Section id="v1" title="What v1 contains">
        <Cards
          columns={4}
          items={[
            {
              title: "Agents",
              text: "List and retrieve. Read-only.",
              href: "/docs/reference#list-agents",
            },
            {
              title: "Phone calls",
              text: "Place, list, retrieve and hang up.",
              href: "/docs/reference#place-call",
            },
            {
              title: "Text conversations",
              text: "Start, send a message and end.",
              href: "/docs/reference#start-conversation",
            },
            {
              title: "One webhook event",
              text: "call.completed, signed and retried.",
              href: "/docs/webhooks",
            },
          ]}
        />
        <P>What it does not contain:</P>
        <Cards
          columns={4}
          items={[
            {
              title: "Managing resources",
              text: "Agents, API keys and webhook endpoints are created and edited in the app.",
            },
            {
              title: "Pagination",
              text: "GET /v1/calls reaches the 200 most recent calls and no further.",
            },
            {
              title: "Idempotency keys",
              text: "Sending POST /v1/calls twice places two calls.",
            },
            {
              title: "SDKs",
              text: "Samples use each language's standard HTTP client.",
            },
          ]}
        />
        <P>
          Behaviour that is known to be wrong today is listed under{" "}
          <Link href="/docs/errors#known-issues">Known issues</Link>.
        </P>
      </Section>
    </Article>
  );
}
