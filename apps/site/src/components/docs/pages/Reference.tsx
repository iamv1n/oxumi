"use client";

import Link from "next/link";
import { JsonBlock } from "@oxumi/ui/docs/CodeBlock";
import { Endpoint, EndpointIndex, GroupTitle, ObjectDoc } from "../Endpoint";
import { COMPLETED_EVENT, CONVERSATION_REPLY } from "@oxumi/ui/docs/examples";
import { ENDPOINTS } from "../nav";
import { AGENT_LIST, CALL_DETAIL, CALL_LIST } from "@oxumi/ui/docs/samples";
import { Article, C, type FieldDoc, Note, P, PageTitle, Section } from "../ui";
import { Sample } from "./Sample";
import { EVENT_NOTES } from "./Webhooks";

// One line per endpoint, for the index at the top of the page.
const PURPOSE: Record<string, string> = {
  "list-agents": "The project's agents, and whether each is ready.",
  "get-agent": "One agent with its flow, variables and fields.",
  "place-call": "Place a phone call. Answers 202 once it is ringing.",
  "list-calls": "Recent calls, newest first.",
  "get-call": "One call with its outcome, fields and transcript.",
  "hang-up-call": "End a call that is ringing or in progress (Twilio, Vobiz).",
  "start-conversation": "Start a text conversation; returns the agent's first line.",
  "send-message": "Relay what the person typed; returns the reply.",
  "end-conversation": "Close a conversation before its flow finishes.",
};

const ID_PARAM = (what: string): FieldDoc[] => [
  { name: "id", type: "string (UUID)", required: true, description: `The ${what}'s id.` },
];

const NOT_UUID = { status: 400, when: "The id in the path is not a UUID." };

const OUTCOMES = (
  <>
    One of <C>completed</C> (the flow reached an end step with every required answer),{" "}
    <C>partial</C> (it ended with some required answers missing),{" "}
    <C>callback_requested</C> (the person asked to be called later), <C>wrong_person</C>,{" "}
    <C>opted_out</C> (the person asked not to be contacted; the number is then added to the
    project&apos;s do-not-call list), <C>transferred</C> (the caller was put through to a
    person) or <C>failed</C> (nobody was reached, or nothing was collected). An end step in the flow can also set its own outcome.
  </>
);

const AGENT_FIELDS: FieldDoc[] = [
  { name: "id", type: "string (UUID)", description: "The agent's id." },
  { name: "projectId", type: "string (UUID)", description: "The project it belongs to." },
  { name: "name", type: "string", description: "Its name in the app." },
  { name: "description", type: "string", description: "Free text. May be empty." },
  {
    name: "model",
    type: "string",
    description: (
      <>
        The language model the agent uses, as <C>&lt;provider&gt;:&lt;model&gt;</C>. An empty
        string means the project&apos;s default.
      </>
    ),
  },
  {
    name: "speech",
    type: "string",
    description: "The speech provider the agent uses on phone calls. An empty string means the project's default.",
  },
  {
    name: "telephony",
    type: "string",
    description: (
      <>
        The telephony provider this agent places calls through: <C>twilio</C>,{" "}
        <C>exotel</C> or <C>vobiz</C>. An empty string means whichever the project has connected.
      </>
    ),
  },
  {
    name: "phoneNumber",
    type: "string",
    description:
      "The number this agent calls from, when it should not be the provider's default. An empty string means the default.",
  },
  {
    name: "ready",
    type: "boolean",
    description: (
      <>
        <C>true</C> when the flow has no errors. Only a ready agent can place calls or start
        conversations.
      </>
    ),
  },
  { name: "stepCount", type: "number", description: "How many steps the flow has." },
  { name: "updatedAt", type: "string (ISO 8601)", description: "When the agent was last saved." },
  {
    name: "createdAt",
    type: "string (ISO 8601)",
    tag: "Retrieve only",
    description: "When the agent was created.",
  },
  {
    name: "issues",
    type: "array",
    tag: "Retrieve only",
    description: (
      <>
        Problems found in the flow. Each is <C>{"{ level, message }"}</C>, where <C>level</C> is{" "}
        <C>error</C> or <C>warning</C>. Any <C>error</C> makes <C>ready</C> false.
      </>
    ),
  },
  {
    name: "flow",
    type: "object",
    tag: "Retrieve only",
    description: (
      <>
        The flow as saved in the builder. For an agent that is not ready it may be incomplete.
      </>
    ),
  },
  {
    name: "flow.variables",
    type: "array",
    tag: "Retrieve only",
    description: (
      <>
        What a call must be given: <C>{"{ name, description, example }"}</C> for each. These are
        the keys to send as <C>variables</C>.
      </>
    ),
  },
  {
    name: "flow.fields",
    type: "array",
    tag: "Retrieve only",
    description: (
      <>
        What a call collects: <C>{"{ name, type, description, options, required }"}</C>.{" "}
        <C>type</C> is <C>string</C>, <C>number</C>, <C>boolean</C> or <C>enum</C>;{" "}
        <C>options</C> lists the allowed values of an enum.
      </>
    ),
  },
  {
    name: "flow.settings",
    type: "object",
    tag: "Retrieve only",
    description: (
      <>
        <C>persona</C>, <C>languages</C> (<C>hi</C>, <C>en</C>), <C>maxAttempts</C> per question,{" "}
        <C>maxDurationSec</C> for the whole call, and optionally <C>voiceId</C>.
      </>
    ),
  },
  {
    name: "flow.nodes",
    type: "array",
    tag: "Retrieve only",
    description: (
      <>
        The steps. Each has an <C>id</C> and a <C>type</C>: <C>start</C>, <C>say</C>, <C>ask</C>,{" "}
        <C>branch</C> or <C>end</C>. <C>flow.start</C> names the first one.
      </>
    ),
  },
];

const CALL_FIELDS: FieldDoc[] = [
  { name: "id", type: "string (UUID)", description: "The call's id." },
  { name: "projectId", type: "string (UUID)", description: "The project it belongs to." },
  { name: "agentId", type: "string (UUID)", description: "The agent that made it." },
  {
    name: "agent",
    type: "object",
    tag: "List and retrieve",
    description: (
      <>
        <C>{"{ id, name }"}</C> of that agent. Not present in the response to placing a call.
      </>
    ),
  },
  {
    name: "channel",
    type: "string",
    description: (
      <>
        <C>phone</C> for a call placed through the API, <C>api_text</C> for a text
        conversation, and <C>browser_voice</C> or <C>browser_text</C> for test calls made in the
        app.
      </>
    ),
  },
  {
    name: "status",
    type: "string",
    description: (
      <>
        <C>queued</C>, <C>ringing</C>, <C>in_progress</C> or <C>ended</C>. See{" "}
        <Link href="/docs/placing-calls#after">After the request</Link>.
      </>
    ),
  },
  { name: "outcome", type: "string | null", description: <>null until the call ends. {OUTCOMES}</> },
  {
    name: "error",
    type: "string | null",
    description: (
      <>
        Why the call failed, in words, when nobody was reached. See{" "}
        <Link href="/docs/placing-calls#unreached">When nobody answers</Link>.
      </>
    ),
  },
  {
    name: "fields",
    type: "object",
    description:
      "The answers collected so far, keyed by field name. Values are strings, numbers or booleans, each already checked against its field's type.",
  },
  { name: "variables", type: "object", description: "The variables the call was started with, as strings." },
  { name: "metadata", type: "object", description: "What you attached when placing the call, as strings." },
  {
    name: "to",
    type: "string | null",
    description: "The number dialled, with spaces and punctuation removed. null unless the channel is phone.",
  },
  {
    name: "model",
    type: "string",
    description: (
      <>
        The language model the call runs on, as <C>&lt;provider&gt;:&lt;model&gt;</C>.
      </>
    ),
  },
  {
    name: "telephony",
    type: "string | null",
    description: (
      <>
        <C>twilio</C>, <C>exotel</C> or <C>vobiz</C> for phone calls, otherwise null.
      </>
    ),
  },
  {
    name: "providerCallId",
    type: "string | null",
    description: "The telephony provider's own id for the call, useful when reading that provider's logs.",
  },
  { name: "startedAt", type: "string (ISO 8601)", description: "When the call record was created." },
  { name: "endedAt", type: "string | null", description: "When the call ended." },
  {
    name: "turnCount",
    type: "number",
    tag: "List only",
    description: "How many turns the call has.",
  },
  {
    name: "turns",
    type: "array",
    tag: "Retrieve only",
    description: (
      <>
        The transcript: <Link href="#turn-object">Turn objects</Link> in order of <C>index</C>.
      </>
    ),
  },
];

const TURN_FIELDS: FieldDoc[] = [
  { name: "id", type: "string (UUID)", description: "The turn's id." },
  { name: "callId", type: "string (UUID)", description: "The call it belongs to." },
  { name: "index", type: "number", description: "Its position in the call, counting up." },
  {
    name: "callerText",
    type: "string | null",
    description: "What the person said or typed. null on the agent's opening line.",
  },
  { name: "agentText", type: "string", description: "What the agent said in reply." },
  {
    name: "interrupted",
    type: "boolean",
    description: "true when the person started talking before the agent finished the line.",
  },
  {
    name: "nodeId",
    type: "string",
    description: "The id of the flow step the call had reached once this turn was processed.",
  },
  {
    name: "llmMs",
    type: "number | null",
    description: "Milliseconds from the person finishing to the first text from the language model.",
  },
  {
    name: "audioMs",
    type: "number | null",
    description: "Milliseconds from the person finishing to the first audio. null for text.",
  },
  { name: "createdAt", type: "string (ISO 8601)", description: "When the turn was recorded." },
];

const REPLY_FIELDS: FieldDoc[] = [
  {
    name: "callId",
    type: "string (UUID)",
    description: "The conversation's id. Also the id of its call record.",
  },
  { name: "reply", type: "string", description: "What the agent says next. Show this to the person." },
  {
    name: "fields",
    type: "object",
    description: "Every field collected so far, keyed by name.",
  },
  { name: "step", type: "string", description: "The id of the flow step the conversation is now on." },
  { name: "ended", type: "boolean", description: "true when this was the agent's final line." },
  { name: "outcome", type: "string | null", description: <>null until <C>ended</C> is true. {OUTCOMES}</> },
];

const EVENT_FIELDS: FieldDoc[] = Object.entries(EVENT_NOTES).map(([name, note]) => ({
  name,
  type: note.type,
  description: note.text,
}));

export default function Reference() {
  return (
    <Article>
      <PageTitle kicker="Reference" title="API reference">
        Nine endpoints and five objects. Every endpoint needs a bearer key and is scoped to the
        key&apos;s project.
      </PageTitle>

      <Section id="endpoints" title="All endpoints">
        <EndpointIndex
          rows={ENDPOINTS.map((endpoint) => ({
            id: endpoint.id,
            method: endpoint.method,
            path: endpoint.path,
            purpose: PURPOSE[endpoint.id] ?? endpoint.title,
          }))}
        />
      </Section>

      <GroupTitle>Agents</GroupTitle>

      <Endpoint
        id="list-agents"
        title="List agents"
        method="GET"
        path="/v1/agents"
        returns={
          <>
            An array of <Link href="#agent-object">Agent</Link> objects in their short form,
            most recently updated first. The whole list is returned; there is no pagination.
          </>
        }
        aside={<Sample topic="listAgents" />}
      >
        Lists the project&apos;s agents. Use it to find the <C>id</C> of the agent to call with,
        and to check that it is <C>ready</C>.
      </Endpoint>

      <Endpoint
        id="get-agent"
        title="Retrieve an agent"
        method="GET"
        path="/v1/agents/:id"
        pathParams={ID_PARAM("agent")}
        returns={
          <>
            One <Link href="#agent-object">Agent</Link> with its <C>flow</C>, <C>issues</C> and{" "}
            <C>createdAt</C>.
          </>
        }
        errors={[NOT_UUID, { status: 404, when: "No agent with this id in the key's project." }]}
        aside={<Sample topic="getAgent" />}
      >
        Returns one agent in full, including its flow. Read <C>flow.variables</C> to learn what a
        call must be given and <C>flow.fields</C> to learn what it will collect.
      </Endpoint>

      <GroupTitle>Calls</GroupTitle>

      <Endpoint
        id="place-call"
        title="Place a call"
        method="POST"
        path="/v1/calls"
        body={[
          {
            name: "agentId",
            type: "string (UUID)",
            required: true,
            description: "The agent to make the call. Its flow must be ready.",
          },
          {
            name: "to",
            type: "string",
            required: true,
            description: (
              <>
                The number to dial in international format, such as <C>+919876543210</C>. Spaces,
                hyphens and parentheses are removed; the rest must be <C>+</C> and 8 to 15
                digits.
              </>
            ),
          },
          {
            name: "variables",
            type: "object",
            description: (
              <>
                A value for every variable the flow declares. Required whenever the flow has
                variables. Strings, numbers and booleans are accepted and stored as strings.
              </>
            ),
          },
          {
            name: "metadata",
            type: "object",
            description:
              "Your own key-value pairs, stored with the call and returned in the webhook. Strings, numbers and booleans are accepted and stored as strings.",
          },
          {
            name: "consent",
            type: "object",
            description: (
              <>
                Evidence that the person agreed to be called, recorded before the call is
                checked: <C>{'{ "given": true, "source": "website form", "capturedAt": "2026-10-01T10:00:00Z" }'}</C>.
                Needed when the project only calls numbers with recorded consent and this
                number has none yet.
              </>
            ),
          },
          {
            name: "provider",
            type: "string",
            description: (
              <>
                <C>twilio</C>, <C>exotel</C> or <C>vobiz</C>. Defaults to the agent&apos;s own{" "}
                <C>telephony</C> setting; if that is empty, to the first one connected, tried
                in that order.
              </>
            ),
          },
          {
            name: "model",
            type: "string",
            description: (
              <>
                A language model as <C>&lt;provider&gt;:&lt;model&gt;</C>. Defaults to the
                agent&apos;s model, then the project&apos;s default.
              </>
            ),
          },
        ]}
        returns={
          <>
            <C>202</C> and the new <Link href="#call-object">Call</Link>, with status{" "}
            <C>ringing</C>. This response has no <C>agent</C>, <C>turns</C> or{" "}
            <C>turnCount</C>.
          </>
        }
        errors={[
          {
            status: 400,
            when: (
              <>
                <C>agentId</C> or <C>to</C> is missing or invalid; a variable has no value;{" "}
                <C>provider</C> or <C>model</C> is not recognised; a telephony, speech or model
                provider is not connected; or the telephony provider refused the call.
              </>
            ),
          },
          { status: 402, when: "The project has reached its monthly spending limit." },
          { status: 404, when: "No agent with this id in the key's project." },
          {
            status: 422,
            when: "The agent's flow has an error, or the number is on the do-not-call list, outside calling hours, or lacks required consent. The message says which.",
          },
          { status: 503, when: "The server has no public URL, so providers cannot call back." },
        ]}
        aside={<Sample topic="placeCall" />}
      >
        Places a phone call and returns once the telephony provider has accepted it. The result
        arrives later as a <C>call.completed</C> webhook.{" "}
        <Link href="/docs/placing-calls">Place a call</Link> covers the order of the checks and
        what happens when nobody answers.
      </Endpoint>

      <Endpoint
        id="list-calls"
        title="List calls"
        method="GET"
        path="/v1/calls"
        query={[
          {
            name: "agentId",
            type: "string (UUID)",
            description: "Return only calls made by this agent.",
          },
          {
            name: "limit",
            type: "integer",
            description: (
              <>
                How many calls to return, from 1 to 200. Defaults to 50. Larger values are
                treated as 200; <C>0</C> or a non-number is treated as 50.
              </>
            ),
          },
        ]}
        returns={
          <>
            An array of <Link href="#call-object">Call</Link> objects, newest first by{" "}
            <C>startedAt</C>. Each has <C>agent</C> and <C>turnCount</C> but not <C>turns</C>.
            Calls on every channel are included, among them test calls made in the app.
          </>
        }
        errors={[
          {
            status: 500,
            when: (
              <>
                <C>agentId</C> is not a UUID. A <Link href="/docs/errors#known-issues">known issue</Link>
                .
              </>
            ),
          },
        ]}
        aside={<Sample topic="listCalls" />}
      >
        Lists the project&apos;s calls. There is no pagination: only the 200 most recent calls
        can be reached, after any <C>agentId</C> filter is applied.
      </Endpoint>

      <Endpoint
        id="get-call"
        title="Retrieve a call"
        method="GET"
        path="/v1/calls/:id"
        pathParams={ID_PARAM("call")}
        returns={
          <>
            One <Link href="#call-object">Call</Link> with <C>agent</C> and its <C>turns</C> in
            order. For a call still in progress, the turns recorded so far.
          </>
        }
        errors={[NOT_UUID, { status: 404, when: "No call with this id in the key's project." }]}
        aside={<Sample topic="getCall" />}
      >
        Returns one call with its transcript. The sample is a test call made in the app, which
        is why its channel is <C>browser_voice</C>; a phone call has the same shape.
      </Endpoint>

      <Endpoint
        id="hang-up-call"
        title="Hang up a call"
        method="DELETE"
        path="/v1/calls/:id"
        pathParams={ID_PARAM("call")}
        returns={
          <>
            <C>204</C> with no body. Also <C>204</C>, with no effect, when the call has already
            ended.
          </>
        }
        errors={[
          {
            status: 400,
            when: "The call was placed through Exotel, which cannot end a call through its API. Or the id is not a UUID.",
          },
          { status: 404, when: "No call with this id in the key's project." },
        ]}
        aside={<Sample topic="hangUpCall" />}
      >
        Ends a call that is ringing or in progress. Works for calls placed through Twilio or Vobiz. The
        call&apos;s result is still delivered by webhook.
      </Endpoint>

      <GroupTitle>Conversations</GroupTitle>

      <Endpoint
        id="start-conversation"
        title="Start a conversation"
        method="POST"
        path="/v1/conversations"
        body={[
          {
            name: "agentId",
            type: "string (UUID)",
            required: true,
            description: "The agent to talk to. Its flow must be ready.",
          },
          {
            name: "variables",
            type: "object",
            description: (
              <>
                A value for every variable the flow declares. Required whenever the flow has
                variables. <strong>Every value must be a string</strong>; otherwise the whole
                object is ignored.
              </>
            ),
          },
          {
            name: "model",
            type: "string",
            description: (
              <>
                A language model as <C>&lt;provider&gt;:&lt;model&gt;</C>. Defaults to the
                agent&apos;s model, then the project&apos;s default.
              </>
            ),
          },
        ]}
        returns={
          <>
            <C>201</C> and a <Link href="#reply-object">Reply</Link> holding the new{" "}
            <C>callId</C> and the agent&apos;s opening line.
          </>
        }
        errors={[
          {
            status: 400,
            when: (
              <>
                <C>agentId</C> is missing; a variable has no value; <C>model</C> is not
                recognised; or the model&apos;s provider is not connected.
              </>
            ),
          },
          { status: 404, when: "No agent with this id in the key's project." },
          { status: 422, when: "The agent's flow has an error. The message quotes it." },
          {
            status: 502,
            when: "The language model could not be reached. The conversation is closed with outcome failed.",
          },
        ]}
        aside={<Sample topic="startConversation" />}
      >
        Starts a text conversation with an agent and returns its first line. See{" "}
        <Link href="/docs/conversations">Text conversations</Link> for the whole exchange.
      </Endpoint>

      <Endpoint
        id="send-message"
        title="Send a message"
        method="POST"
        path="/v1/conversations/:id/messages"
        pathParams={[
          {
            name: "id",
            type: "string (UUID)",
            required: true,
            description: (
              <>
                The conversation&apos;s <C>callId</C>.
              </>
            ),
          },
        ]}
        body={[
          {
            name: "text",
            type: "string",
            required: true,
            description: "What the person typed. Surrounding whitespace is removed; it must not be empty.",
          },
        ]}
        returns={
          <>
            <C>200</C> and a <Link href="#reply-object">Reply</Link> with the agent&apos;s next
            line and the fields collected so far.
          </>
        }
        errors={[
          { status: 400, when: "text is missing or empty, or the id is not a UUID." },
          { status: 409, when: "The previous message is still being answered." },
          {
            status: 410,
            when: "The conversation has ended, expired after 15 idle minutes, never existed, or was lost in a restart.",
          },
          {
            status: 502,
            when: "The language model could not be reached. The conversation is closed with outcome failed.",
          },
        ]}
        aside={<Sample topic="sendMessage" />}
      >
        Relays what the person typed and returns the agent&apos;s reply.
      </Endpoint>

      <Endpoint
        id="end-conversation"
        title="End a conversation"
        method="DELETE"
        path="/v1/conversations/:id"
        pathParams={[
          {
            name: "id",
            type: "string (UUID)",
            required: true,
            description: (
              <>
                The conversation&apos;s <C>callId</C>.
              </>
            ),
          },
        ]}
        returns={
          <>
            <C>204</C> with no body. Also <C>204</C> when the conversation has already ended or
            the id is unknown, so it is safe to call more than once.
          </>
        }
        errors={[NOT_UUID]}
        aside={<Sample topic="endConversation" />}
      >
        Closes a conversation before its flow has finished. The call record gets outcome{" "}
        <C>partial</C> if any field was collected and <C>failed</C> if none was, and the webhook
        is sent.
      </Endpoint>

      <GroupTitle>Objects</GroupTitle>

      <ObjectDoc
        id="agent-object"
        title="The Agent object"
        fields={AGENT_FIELDS}
        aside={
          <JsonBlock
            value={AGENT_LIST[0]}
            title="Agent, as listed"
            provenance="captured"
          />
        }
      >
        An agent is a flow with a name, a model and a voice. Agents are designed in the app; the
        API reads them. The list returns the short form; retrieving one adds the attributes
        marked below.
      </ObjectDoc>

      <ObjectDoc
        id="call-object"
        title="The Call object"
        fields={CALL_FIELDS}
        aside={<JsonBlock value={CALL_LIST[0]} title="Call, as listed" provenance="captured" />}
      >
        One conversation between an agent and a person, on any channel. A phone call and a text
        conversation are both calls.
      </ObjectDoc>

      <ObjectDoc
        id="turn-object"
        title="The Turn object"
        fields={TURN_FIELDS}
        aside={<JsonBlock value={CALL_DETAIL.turns[1]} title="Turn" provenance="captured" />}
      >
        One exchange in a call: what the person said, and what the agent answered. The first
        turn of a call has no caller text, because the agent speaks first.
      </ObjectDoc>

      <ObjectDoc
        id="reply-object"
        title="The Reply object"
        fields={REPLY_FIELDS}
        aside={<JsonBlock value={CONVERSATION_REPLY} title="Reply" provenance="example" />}
      >
        What both conversation endpoints return: the agent&apos;s next line and the state of the
        conversation after it.
      </ObjectDoc>

      <ObjectDoc
        id="event-object"
        title="The webhook event"
        fields={EVENT_FIELDS}
        aside={
          <JsonBlock value={COMPLETED_EVENT} title="call.completed" provenance="example" />
        }
      >
        <p>
          The body posted to your webhook endpoints. Paths below are written from the top of the
          body; <C>[]</C> means each item of an array.
        </p>
        <Note title="Different from the Call object">
          <p>
            <C>data.call</C> is a summary, not the <Link href="#call-object">Call</Link> above.
            Compare the two before sharing code between your webhook handler and your API
            client. <Link href="/docs/webhooks#payload">Receiving results</Link> has an
            interactive view of this payload.
          </p>
        </Note>
      </ObjectDoc>

      <P>
        Looking for something that is not here? <Link href="/docs/changelog#v1">Versioning</Link>{" "}
        lists what v1 does not yet do.
      </P>
    </Article>
  );
}
