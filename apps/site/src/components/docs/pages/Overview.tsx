"use client";

import Link from "next/link";
import Lifecycle from "../Lifecycle";
import { BASE_URL } from "@oxumi/ui/docs/request";
import { Article, C, Cards, Glance, P, PageTitle, Section, Steps } from "../ui";
import { Sample } from "./Sample";

export default function Overview() {
  return (
    <Article>
      <PageTitle kicker="Oxumi API · v1" title="Put an agent on the phone from your own code.">
        Ask for a phone call and one of your agents places it, follows its flow and collects the
        answers. When the call ends, the outcome, the validated fields and the transcript are
        posted to your webhook.
      </PageTitle>

      <Section id="at-a-glance" title="At a glance">
        <Glance
          items={[
            {
              label: "Base URL",
              value: `${BASE_URL}/v1`,
              note: "JSON in, JSON out. Ids are UUIDs; times are ISO 8601, UTC.",
            },
            {
              label: "Auth header",
              value: "Authorization: Bearer ox_live_…",
              copy: "Authorization: Bearer ",
              note: (
                <>
                  A project key, created in the app. <Link href="/docs/authentication">More</Link>
                </>
              ),
            },
            {
              label: "Rate limit",
              value: "120 requests / minute",
              copy: "120",
              note: (
                <>
                  Per key. Headers say what is left. <Link href="/docs/rate-limits">More</Link>
                </>
              ),
            },
            {
              label: "Webhook signature",
              value: "Oxumi-Signature: t=…,v1=…",
              copy: "Oxumi-Signature",
              note: (
                <>
                  HMAC-SHA256 of the raw body. <Link href="/docs/webhooks#verify">More</Link>
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="quickstart" title="First call in five minutes" aside={<Sample topic="placeCall" />}>
        <P>
          A phone call is one request from you and one webhook back. In between, the call moves
          through three statuses.
        </P>
        <Lifecycle />
        <Steps>
          <li>
            <strong>Connect what a call needs</strong>
            In the app, under Integrations: a telephony provider (Twilio, Exotel or Vobiz), a speech
            provider (ElevenLabs or Sarvam) and a language-model provider.
          </li>
          <li>
            <strong>Create a key and a webhook</strong>
            Both on the project&apos;s API page. See{" "}
            <Link href="/docs/authentication">Authentication</Link>.
          </li>
          <li>
            <strong>Find a ready agent</strong>
            <Link href="/docs/reference#list-agents">GET /v1/agents</Link> lists them. Take the{" "}
            <C>id</C> of one with <C>ready: true</C>.
          </li>
          <li>
            <strong>Place the call</strong>
            Send the agent, the number and the flow&apos;s variables, as on the right. The
            response is <C>202</C> as soon as the phone rings.{" "}
            <Link href="/docs/placing-calls">Place a call</Link>
          </li>
          <li>
            <strong>Receive and verify the result</strong>A signed <C>call.completed</C> event
            arrives at your webhook when the call ends.{" "}
            <Link href="/docs/webhooks">Receive the result</Link>
          </li>
        </Steps>
      </Section>

      <Section id="guides" title="Where to go next">
        <Cards
          columns={4}
          items={[
            {
              title: "Authentication",
              text: "Keys, the bearer header, rotation.",
              href: "/docs/authentication",
            },
            {
              title: "Place a call",
              text: "Variables, metadata, what happens when nobody answers.",
              href: "/docs/placing-calls",
            },
            {
              title: "Receive the result",
              text: "The payload, signatures, retries.",
              href: "/docs/webhooks",
            },
            {
              title: "Text conversations",
              text: "The same flow over typed messages.",
              href: "/docs/conversations",
            },
            { title: "Errors", text: "Every status the API returns.", href: "/docs/errors" },
            { title: "Rate limits", text: "The limit, its headers, 429.", href: "/docs/rate-limits" },
            {
              title: "API reference",
              text: "Nine endpoints and five objects.",
              href: "/docs/reference",
            },
            { title: "Versioning", text: "What v1 means today.", href: "/docs/changelog" },
          ]}
        />
      </Section>

      <Section id="know-first" title="What to know first">
        <Cards
          items={[
            {
              title: "Phone calls need connected providers",
              text: "Without telephony, speech and a model provider, placing a call returns 400 and nothing is dialled.",
            },
            {
              title: "API conversations are text",
              text: "Conversations exchange typed messages. Voice over the API is the phone call.",
            },
            {
              title: "Hanging up works with Twilio and Vobiz",
              text: "Exotel calls end at the flow's time limit.",
            },
            {
              title: "Some state lives in one server's memory",
              text: "Rate-limit counters and conversations in progress are per server instance; a restart loses them.",
            },
            {
              title: "Call it from your server",
              text: "The API does not allow cross-origin browser requests, and a key in a browser is a leaked key.",
            },
            {
              title: "No SDKs, and an early build",
              text: "Samples use each language's standard HTTP client. v1 may still change.",
            },
          ]}
        />
      </Section>
    </Article>
  );
}
