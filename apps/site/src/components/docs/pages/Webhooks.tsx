"use client";

import Link from "next/link";
import { CodeBlock, JsonBlock, SampleBlock } from "@oxumi/ui/docs/CodeBlock";
import { COMPLETED_EVENT } from "@oxumi/ui/docs/examples";
import JsonExplorer, { type Notes } from "../JsonExplorer";
import { PING_DELIVERY } from "@oxumi/ui/docs/samples";
import { VERIFY_SAMPLES } from "@oxumi/ui/docs/verify";
import { Article, C, Facts, List, Note, P, PageTitle, Section, Table } from "../ui";
import { routes } from "@/lib/routes";

// What each field of a call.completed delivery means. Paths use "[]" for
// "each item of this array".
export const EVENT_NOTES: Notes = {
  id: {
    type: "string (UUID)",
    text: "The delivery's id. The same value is sent in the Oxumi-Delivery header and stays the same across retries. Use it to ignore repeats.",
  },
  event: {
    type: "string",
    text: 'The event name: "call.completed" for a finished call, or "ping" for a test delivery sent from the app.',
  },
  createdAt: {
    type: "string (ISO 8601)",
    text: "When the event was created, moments after the call ended. It does not change on retries.",
  },
  data: { type: "object", text: "The event's content. For call.completed it holds one key, call." },
  "data.call": { type: "object", text: "The finished call." },
  "data.call.id": {
    type: "string (UUID)",
    text: "The call's id: the one POST /v1/calls returned, or callId for a text conversation.",
  },
  "data.call.agentId": { type: "string (UUID)", text: "The agent that made the call." },
  "data.call.agentName": {
    type: "string | null",
    text: "The agent's name at the time the call ended.",
  },
  "data.call.channel": {
    type: "string",
    text: '"phone" for a phone call or "api_text" for a text conversation. Calls made in the app\'s Test tab do not produce webhooks.',
  },
  "data.call.to": {
    type: "string | null",
    text: "The number dialled, as normalised by the API. null for text conversations.",
  },
  "data.call.status": { type: "string", text: 'Always "ended" in this event.' },
  "data.call.outcome": {
    type: "string",
    text: "How the call ended: completed, partial, callback_requested, wrong_person, opted_out, transferred or failed.",
  },
  "data.call.handoff": {
    type: "object | null",
    text: 'Set when the agent handed the caller to a person, or tried to: to (the number), reason ("step" for a transfer step, "requested" when the caller asked), status ("connected" or "failed"), summary (what the person taking over was told) and error. null otherwise.',
  },
  "data.call.error": {
    type: "string | null",
    text: 'Why the call failed, in words, when the person was never reached: for example "Nobody answered." Otherwise null.',
  },
  "data.call.fields": {
    type: "object",
    text: "The answers collected, keyed by field name. Each value has passed its field's check and is a string, a number or a boolean. Fields that were never collected are absent.",
  },
  "data.call.variables": {
    type: "object",
    text: "The variables the call was started with, as strings.",
  },
  "data.call.metadata": {
    type: "object",
    text: "Whatever you sent as metadata when placing the call, as strings. Empty for text conversations.",
  },
  "data.call.model": {
    type: "string",
    text: 'The language model the call ran on, as "<provider>:<model>".',
  },
  "data.call.startedAt": {
    type: "string (ISO 8601)",
    text: "When the call record was created, which is when you made the request.",
  },
  "data.call.endedAt": { type: "string (ISO 8601)", text: "When the call ended." },
  "data.call.durationSeconds": {
    type: "number",
    text: "Whole seconds from startedAt to endedAt. For a phone call this includes the time spent ringing.",
  },
  "data.call.turns": {
    type: "array",
    text: "The transcript, in order. One item per agent reply. Empty when the person was never reached.",
  },
  "data.call.turns[].index": {
    type: "number",
    text: "The turn's position in the call, counting up.",
  },
  "data.call.turns[].caller": {
    type: "string | null",
    text: "What the person said (transcribed, for phone calls). null on the agent's opening line.",
  },
  "data.call.turns[].agent": { type: "string", text: "What the agent said in reply." },
  "data.call.turns[].interrupted": {
    type: "boolean",
    text: "true when the person started talking before the agent finished this line.",
  },
  "data.call.turns[].step": {
    type: "string",
    text: "The id of the flow step the call had reached once this turn was processed.",
  },
};

const PING_HTTP = `POST /hooks/oxumi HTTP/1.1
Content-Type: ${PING_DELIVERY.headers["content-type"]}
User-Agent: ${PING_DELIVERY.headers["user-agent"]}
Oxumi-Event: ${PING_DELIVERY.headers["oxumi-event"]}
Oxumi-Delivery: ${PING_DELIVERY.headers["oxumi-delivery"]}
Oxumi-Signature: ${PING_DELIVERY.headers["oxumi-signature"]}

${JSON.stringify(PING_DELIVERY.body)}`;

export default function Webhooks() {
  return (
    <Article>
      <PageTitle kicker="Get started · 4 of 4" title="Receive the result">
        When a call ends, Oxumi posts the result to a URL in your system. That request is
        signed, retried for about seven hours if your server is down, and carries an id you can
        use to ignore repeats.
      </PageTitle>

      <Section
        id="setup"
        title="Set up an endpoint"
        aside={
          <Facts
            title="Webhook endpoints"
            rows={[
              ["Where", "In the app: project → API → Webhooks"],
              ["Per project", "Up to 5, each can be switched off"],
              ["Secret", "whsec_…, shown once when the endpoint is created"],
              ["Event", "call.completed"],
              ["Sent for", "Phone calls and API text conversations"],
              ["Not sent for", "Calls made in the app's Test tab"],
            ]}
          />
        }
      >
        <P>
          Add an endpoint on the project&apos;s API page: <Link href={routes.projects}>open your projects</Link>
          , choose a project, then <strong>API → Webhooks</strong>. The API itself has no
          endpoints for managing them.
        </P>
        <P>In production the URL has to meet these rules, and is refused otherwise:</P>
        <List>
          <li>
            It uses <C>https</C> and contains no username or password.
          </li>
          <li>
            Its host resolves to a public address. Loopback, private, link-local and
            carrier-grade NAT ranges are refused. This is checked again on every delivery.
          </li>
          <li>
            Redirects are not followed. A <C>3xx</C> answer counts as a failed attempt.
          </li>
        </List>
      </Section>

      <Section
        id="payload"
        title="The payload"
        aside={
          <JsonExplorer
            title="call.completed"
            value={COMPLETED_EVENT}
            notes={EVENT_NOTES}
            intro="Point at a field, or tab to it, to see what it holds. Click to keep it selected."
          />
        }
      >
        <P>
          Every delivery is a <C>POST</C> with a JSON body in the same envelope: <C>id</C>,{" "}
          <C>event</C>, <C>createdAt</C> and <C>data</C>. For <C>call.completed</C>,{" "}
          <C>data.call</C> is the finished call.
        </P>
        <Table
          head={["Header", "Value"]}
          rows={[
            [<C key="h">Content-Type</C>, <C key="v">application/json</C>],
            [<C key="h">User-Agent</C>, <C key="v">Oxumi-Webhooks/1</C>],
            [<C key="h">Oxumi-Event</C>, "The event name, the same as event in the body."],
            [<C key="h">Oxumi-Delivery</C>, "The delivery id, the same as id in the body."],
            [
              <C key="h">Oxumi-Signature</C>,
              <>
                <C>t=&lt;unix seconds&gt;,v1=&lt;hex digest&gt;</C>
              </>,
            ],
          ]}
        />
        <Note title="Key order is not fixed">
          <p>
            The sample shows fields in a readable order. On the wire the keys arrive in a
            different order (for instance <C>data</C> before <C>event</C>). Read fields by name,
            and compute the signature over the bytes you received, never over a re-serialised
            copy.
          </p>
        </Note>
        <Note title="Not the same shape as GET /v1/calls/:id">
          <p>
            The call in a webhook is a summary. Its turns use <C>caller</C>, <C>agent</C> and{" "}
            <C>step</C>, where the API&apos;s{" "}
            <Link href="/docs/reference#turn-object">Turn object</Link> uses <C>callerText</C>,{" "}
            <C>agentText</C> and <C>nodeId</C>; it adds <C>agentName</C> and{" "}
            <C>durationSeconds</C> and leaves out <C>projectId</C>.
          </p>
        </Note>
      </Section>

      <Section
        id="verify"
        title="Verify the signature"
        aside={<SampleBlock samples={VERIFY_SAMPLES} title="Verify a delivery" picker={false} />}
      >
        <P>
          Anyone who learns your URL can post to it. The signature proves a delivery came from
          Oxumi and was not altered.
        </P>
        <CodeBlock
          title="Oxumi-Signature"
          language="text"
          code={PING_DELIVERY.headers["oxumi-signature"]}
        />
        <List>
          <li>
            <C>t</C> is the time the attempt was made, in Unix seconds. Every retry is signed
            again with a new <C>t</C>.
          </li>
          <li>
            <C>v1</C> is the HMAC-SHA256, in lowercase hex, of the string{" "}
            <C>&lt;t&gt;.&lt;raw body&gt;</C>, keyed with the endpoint&apos;s secret.
          </li>
        </List>
        <P>To check a delivery, as each sample does:</P>
        <List>
          <li>
            Read the body as raw bytes, before any JSON parsing. Many frameworks parse first by
            default; turn that off for this route.
          </li>
          <li>
            Split the header into <C>t</C> and <C>v1</C>. Reject the delivery if <C>t</C> is
            more than five minutes from your clock, so a captured request cannot be replayed
            later. Oxumi does not enforce a window; the tolerance is yours to choose.
          </li>
          <li>
            Compute the HMAC over <C>t</C>, a full stop, and the raw body, and compare it with{" "}
            <C>v1</C> using a constant-time comparison.
          </li>
        </List>
        <Note title="The cURL tab is a shell script">
          <p>
            There is no server to verify in with cURL, so that tab checks one saved delivery by
            hand with <C>openssl</C>. It is for debugging; verify in your server with one of the
            other eight.
          </p>
        </Note>
      </Section>

      <Section
        id="respond"
        title="Respond quickly"
        aside={
          <Facts
            title="What counts as delivered"
            rows={[
              ["Success", "Any 2xx status"],
              ["Time limit", "10 seconds"],
              ["Response body", "Ignored"],
              ["Redirect (3xx)", "Failed attempt; not followed"],
              ["Other status, timeout, no connection", "Failed attempt"],
            ]}
          />
        }
      >
        <P>
          Answer with any <C>2xx</C> status within <strong>10 seconds</strong>, then do slow
          work afterwards, on a queue or in the background.
        </P>
        <P>
          A receiver that updates three systems before answering will sooner or later time out
          and be sent the same event again.
        </P>
      </Section>

      <Section
        id="retries"
        title="Retries"
        aside={
          <Facts
            title="Attempt → when"
            rows={[
              ["1", "As soon as the call ends"],
              ["2", "30 seconds after attempt 1 fails"],
              ["3", "2 minutes after attempt 2 fails"],
              ["4", "10 minutes after attempt 3 fails"],
              ["5", "1 hour after attempt 4 fails"],
              ["6", "6 hours after attempt 5 fails"],
              ["then", "Marked failed; not sent again automatically"],
            ]}
          />
        }
      >
        <P>
          A failed delivery is tried again, up to six attempts in all over about seven hours.
          Each wait is counted from the attempt that failed.
        </P>
        <P>
          Retries are picked up on a 15-second cycle, so each can run up to 15 seconds later
          than the schedule says.
        </P>
        <P>
          The app&apos;s Webhooks tab lists the project&apos;s 50 most recent deliveries with
          the status your server returned, and can send any of them again.
        </P>
      </Section>

      <Section
        id="idempotency"
        title="Handle repeats"
        aside={
          <CodeBlock
            title="The delivery id, in a real delivery's headers"
            language="http"
            code={`Oxumi-Event: ${PING_DELIVERY.headers["oxumi-event"]}\nOxumi-Delivery: ${PING_DELIVERY.headers["oxumi-delivery"]}`}
            provenance="captured"
          />
        }
      >
        <P>
          Your server can receive the same delivery more than once: when its answer was slow or
          lost, or when someone re-sends it from the app. Make handling it twice harmless.
        </P>
        <List>
          <li>
            The delivery id (<C>id</C> in the body, <C>Oxumi-Delivery</C> in the headers) is
            the same on every attempt of one delivery. Record the ids you have handled and
            skip any you have seen.
          </li>
          <li>
            Each endpoint gets its own delivery, with its own id, for the same call. If two
            endpoints feed one system, de-duplicate on <C>data.call.id</C> instead.
          </li>
        </List>
      </Section>

      <Section
        id="testing"
        title="Test deliveries"
        aside={
          <>
            <CodeBlock
              title="A test delivery as received"
              language="http"
              code={PING_HTTP}
              provenance="captured"
            />
            <JsonBlock value={PING_DELIVERY.body} title="Its body" provenance="captured" />
          </>
        }
      >
        <P>
          The app can send a test delivery to an endpoint at any time. It is a real, signed
          request with the event <C>ping</C>, so it exercises your signature check and your{" "}
          <C>2xx</C> answer without placing a call.
        </P>
        <P>
          A <C>ping</C> is not something you subscribe to: it goes only to the endpoint you
          test. Have your receiver accept it and do nothing.
        </P>
        <P>
          Outside production, <C>http</C> URLs and local addresses are accepted, so a receiver
          on <C>localhost</C> works against a development server.
        </P>
      </Section>
    </Article>
  );
}
