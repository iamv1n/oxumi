"use client";

import Link from "next/link";
import { JsonBlock } from "@oxumi/ui/docs/CodeBlock";
import { CONVERSATION_FINAL, ERRORS } from "@oxumi/ui/docs/examples";
import { Article, C, Cards, Facts, List, Note, P, PageTitle, Section } from "../ui";
import { Sample } from "./Sample";

export default function Conversations() {
  return (
    <Article>
      <PageTitle kicker="Guide" title="Text conversations">
        The same agent, the same flow and the same fields, exchanged as typed messages. Your
        system carries the messages between the person and the API, one turn at a time.
      </PageTitle>

      <Section
        id="how"
        title="How it works"
        aside={
          <Facts
            title="A conversation"
            rows={[
              ["Recorded as", 'A call with channel "api_text"'],
              ["Its id", "callId, also the id in GET /v1/calls"],
              ["Who speaks first", "The agent"],
              ["Messages", "One at a time; a second gets 409"],
              ["Idle limit", "15 minutes, then it is closed"],
              ["When it ends", "call.completed is sent to your webhooks"],
            ]}
          />
        }
      >
        <P>
          A text conversation is for surfaces where people type, such as a chat widget or a
          messaging bot. You start it, show the agent&apos;s line to the person, send back what
          they typed, and repeat until the flow ends.
        </P>
        <P>
          Each request returns the agent&apos;s next line together with every field collected
          so far, so you always hold the current state.
        </P>
      </Section>

      <Section id="start" title="Start a conversation" aside={<Sample topic="startConversation" />}>
        <P>
          <Link href="/docs/reference#start-conversation">POST /v1/conversations</Link> takes
          the <C>agentId</C> and the flow&apos;s <C>variables</C>, and optionally a{" "}
          <C>model</C>. The response already contains the agent&apos;s opening line in{" "}
          <C>reply</C>. Keep <C>callId</C>: it identifies the conversation in every later
          request.
        </P>
        <Note title="Variables must be strings here" tone="warning">
          <p>
            Unlike <C>POST /v1/calls</C>, this endpoint does not convert numbers or booleans.
            If any value in <C>variables</C> is not a string, the whole object is ignored and
            the response is <C>400 Missing variables</C> naming every variable. Send{" "}
            <C>&quot;9&quot;</C>, not <C>9</C>.
          </p>
        </Note>
        <P>
          There is no <C>metadata</C> on a conversation. Keep the link between <C>callId</C> and
          your own record on your side.
        </P>
      </Section>

      <Section id="reply" title="Relay each message" aside={<Sample topic="sendMessage" />}>
        <P>
          Send what the person typed as <C>text</C> to{" "}
          <Link href="/docs/reference#send-message">POST /v1/conversations/:id/messages</Link>.
          The response is the agent&apos;s reply and the updated state.
        </P>
        <List>
          <li>
            <C>fields</C> holds everything collected so far, not only what this message added.
          </li>
          <li>
            <C>step</C> is the id of the flow step the conversation is now on.
          </li>
          <li>
            <C>ended</C> turns <C>true</C> on the final reply, and <C>outcome</C> is set at the
            same moment. Until then <C>outcome</C> is <C>null</C>.
          </li>
        </List>
        <P>
          Send one message at a time. A message that arrives while the previous one is still
          being answered gets <C>409</C>. The reply comes back whole; it is not streamed.
        </P>
      </Section>

      <Section
        id="ending"
        title="How a conversation ends"
        aside={
          <>
            <JsonBlock
              value={CONVERSATION_FINAL}
              status={200}
              title="The final reply"
              provenance="example"
              clip={0}
            />
            <Sample topic="endConversation" />
            <JsonBlock
              value={ERRORS.gone}
              status={410}
              title="A message after the end"
              provenance="captured"
            />
          </>
        }
      >
        <P>A conversation ends in one of four ways. Each of them sends the webhook.</P>
        <List>
          <li>
            <strong>The flow finishes.</strong> The reply has <C>ended: true</C> and the flow&apos;s
            outcome. Nothing more is needed from you.
          </li>
          <li>
            <strong>You end it.</strong>{" "}
            <Link href="/docs/reference#end-conversation">DELETE /v1/conversations/:id</Link>{" "}
            closes it, for instance when the person leaves the chat. The outcome is{" "}
            <C>partial</C> if any field was collected and <C>failed</C> if none was.
          </li>
          <li>
            <strong>It goes quiet.</strong> After 15 minutes without a message it is closed the
            same way. Idle conversations are swept once a minute, so this can take up to a
            minute longer.
          </li>
          <li>
            <strong>The model cannot be reached.</strong> The request returns <C>502</C> and the
            conversation is closed with outcome <C>failed</C>.
          </li>
        </List>
        <P>
          After any of these, a message to the same id gets <C>410</C>. Start a new conversation
          instead.
        </P>
      </Section>

      <Section id="limits" title="Limits">
        <Cards
          columns={4}
          items={[
            { title: "Text only", text: "There is no audio in or out on these endpoints." },
            {
              title: "Held in one server's memory",
              text: "A conversation lives on the server that started it. After a restart the next message gets 410.",
            },
            {
              title: "One message at a time",
              text: "Wait for each reply before sending the next message.",
            },
            {
              title: "A model provider must be connected",
              text: "Otherwise starting returns 400 naming the provider. No telephony or speech is needed.",
            },
          ]}
        />
      </Section>
    </Article>
  );
}
