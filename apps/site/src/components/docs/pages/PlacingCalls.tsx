"use client";

import Link from "next/link";
import { JsonBlock } from "@oxumi/ui/docs/CodeBlock";
import { ERRORS, UNREACHED_CALL } from "@oxumi/ui/docs/examples";
import { Article, C, Facts, List, Note, P, PageTitle, Section, Table } from "../ui";
import { Sample } from "./Sample";

export default function PlacingCalls() {
  return (
    <Article>
      <PageTitle kicker="Get started · 3 of 4" title="Place a call">
        One request places a phone call. The API checks everything it can before the phone
        rings, answers with the call it created, and sends the result to your webhook when the
        call is over.
      </PageTitle>

      <Section id="request" title="The request" aside={<Sample topic="placeCall" />}>
        <P>
          <Link href="/docs/reference#place-call">POST /v1/calls</Link> needs two things: the{" "}
          <C>agentId</C> to use and the number to dial in <C>to</C>.
        </P>
        <P>
          Write the number in international format: a plus sign, the country code, then the
          number. Spaces, hyphens and parentheses are removed for you, so{" "}
          <C>+91 98765 43210</C> is accepted. What remains must be <C>+</C> followed by 8 to 15
          digits.
        </P>
        <P>
          A <C>202</C> means the provider has accepted the call and the phone is about to ring.
          It does not mean anyone has answered.
        </P>
      </Section>

      <Section
        id="checks"
        title="Checks before dialling"
        aside={
          <>
            <JsonBlock value={ERRORS.badNumber} status={400} provenance="captured" />
            <JsonBlock value={ERRORS.notReady} status={422} provenance="captured" />
            <JsonBlock value={ERRORS.noPublicUrl} status={503} provenance="captured" />
          </>
        }
      >
        <P>
          These run in order, and the first that fails is the error you get. Nothing is dialled
          unless all of them pass.
        </P>
        <Table
          head={["#", "Check", "If it fails"]}
          rows={[
            ["1", <><C>agentId</C> is a string</>, <C key="c">400</C>],
            ["2", <><C>to</C> is a valid number</>, <C key="c">400</C>],
            ["3", "The agent exists in the key's project", <C key="c">404</C>],
            ["4", "The agent's flow has no errors", <C key="c">422</C>],
            ["5", "Every flow variable has a value", <C key="c">400</C>],
            ["6", "The number is not on the project's do-not-call list, it is within the project's calling hours, and it has consent if the project requires it", <C key="c">422</C>],
            ["7", "The server can receive provider callbacks", <C key="c">503</C>],
            ["8", "A telephony provider is connected", <C key="c">400</C>],
            ["9", "The model's provider is connected", <C key="c">400</C>],
            ["10", "A speech provider is connected", <C key="c">400</C>],
            ["11", "The project is under its monthly spending limit", <C key="c">402</C>],
            ["12", "The telephony provider accepts the call", <C key="c">400</C>],
          ]}
        />
        <P>
          A <C>422</C> from check 6 carries a <C>code</C> (<C>do_not_call</C>,{" "}
          <C>outside_hours</C> or <C>no_consent</C>) and a <C>blocks</C> list with every reason;
          for calling hours the message says when the next window opens. The project&apos;s
          rules are set under Compliance in the app.
        </P>
        <Note title="Check 12 happens after the call is recorded">
          <p>
            If the provider refuses the call, the response is <C>400</C> with the
            provider&apos;s message, the record is closed with outcome <C>failed</C>, and a{" "}
            <C>call.completed</C> event is still sent.
          </p>
        </Note>
      </Section>

      <Section
        id="variables"
        title="Variables"
        aside={
          <JsonBlock
            value={ERRORS.missingVariables}
            status={400}
            title="A variable is missing"
            provenance="captured"
          />
        }
      >
        <P>
          A flow can declare variables, such as the driver&apos;s name, that its lines use as{" "}
          <C>{"{{driver_name}}"}</C>. They are listed in <C>flow.variables</C> on{" "}
          <Link href="/docs/reference#get-agent">GET /v1/agents/:id</Link>.
        </P>
        <List>
          <li>Every declared variable needs a non-empty value, or the call is refused.</li>
          <li>
            Values are stored as strings. A dropped value (see Metadata, below) counts as
            missing.
          </li>
          <li>Keys the flow does not declare are stored with the call and otherwise ignored.</li>
        </List>
      </Section>

      <Section
        id="metadata"
        title="Metadata"
        aside={
          <Facts
            title="How variables and metadata values are stored"
            rows={[
              ["string", "Kept as it is"],
              ["number", "Converted to a string"],
              ["boolean", 'Converted to "true" or "false"'],
              ["null", "Dropped"],
              ["array, object", "Dropped"],
            ]}
          />
        }
      >
        <P>
          <C>metadata</C> is yours. Put in whatever lets you match the result to your own
          records, such as an order or trip id. It is stored with the call and returned by{" "}
          <C>GET /v1/calls/:id</C> and in the webhook. The agent never sees it.
        </P>
        <P>It is a flat object, stored by the same rules as variables.</P>
      </Section>

      <Section
        id="provider"
        title="Provider and model"
        aside={
          <>
            <Facts
              title="Which telephony provider places the call"
              rows={[
                ["1. provider", "The request's own: twilio, exotel or vobiz"],
                ["2. agent.telephony", "The agent's setting, if not empty"],
                ["3. Twilio", "If the project has it connected"],
                ["4. Exotel", "Otherwise, if connected"],
                ["5. Vobiz", "Otherwise"],
              ]}
            />
            <Facts
              title="Which language model runs the call"
              rows={[
                ["1. model", 'The request\'s own, e.g. "anthropic:claude-haiku-5-5"'],
                ["2. agent.model", "The agent's setting, if not empty"],
                ["3. Default", "The project's default model"],
              ]}
            />
          </>
        }
      >
        <P>
          Both are optional. Leave them out and the agent&apos;s and the project&apos;s own
          settings decide, in the order shown.
        </P>
        <List>
          <li>
            A provider that was named, by the request or by the agent, and is not fully
            connected is a <C>400</C>. There is no fallback to the other one.
          </li>
          <li>
            The voice comes from the agent&apos;s speech setting, and the number the call comes
            from is the agent&apos;s <C>phoneNumber</C> or else the provider&apos;s default.
            Neither can be changed per call.
          </li>
        </List>
      </Section>

      <Section id="after" title="After the request" aside={<Sample topic="getCall" />}>
        <Table
          head={["Status", "Meaning"]}
          rows={[
            [<C key="s">queued</C>, "Recorded, not yet accepted by the provider."],
            [<C key="s">ringing</C>, "Accepted by the provider. This is what the 202 returns."],
            [<C key="s">in_progress</C>, "Answered. The agent is running the flow."],
            [
              <C key="s">ended</C>,
              <>
                Over. <C>outcome</C> and <C>endedAt</C> are set.
              </>,
            ],
          ]}
        />
        <P>
          Wait for the <Link href="/docs/webhooks">webhook</Link> rather than polling. If you do
          poll, <C>GET /v1/calls/:id</C> returns the call with its turns so far.
        </P>
        <P>
          A call cannot run longer than the flow&apos;s time limit,{" "}
          <C>flow.settings.maxDurationSec</C> (300 seconds unless the flow sets another). The
          provider ends it at that point.
        </P>
      </Section>

      <Section
        id="unreached"
        title="When nobody answers"
        aside={
          <JsonBlock
            value={{ call: UNREACHED_CALL }}
            title="data of the call.completed event"
            provenance="example"
            clip={0}
          />
        }
      >
        <P>
          A call that never reaches a person still ends, and still produces a{" "}
          <C>call.completed</C> event. Its <C>outcome</C> is <C>failed</C>, <C>turns</C> is empty,
          and <C>error</C> says what happened.
        </P>
        <Table
          head={["error", "The provider reported"]}
          rows={[
            ["The line was busy.", <C key="p">busy</C>],
            ["Nobody answered.", <C key="p">no-answer</C>],
            ["The call could not be connected.", <C key="p">failed</C>],
            ["The call was cancelled before it was answered.", <C key="p">canceled</C>],
            [
              "The call ended before the conversation started.",
              <>
                <C>completed</C>, with no conversation
              </>,
            ],
          ]}
        />
        <Note title="No automatic redial">
          <p>
            The API does not call again by itself. To retry, place a new call when your system
            decides to, for example after the webhook for the failed one arrives.
          </p>
        </Note>
      </Section>

      <Section id="hanging-up" title="Hanging up" aside={<Sample topic="hangUpCall" />}>
        <P>
          <Link href="/docs/reference#hang-up-call">DELETE /v1/calls/:id</Link> ends a call that
          is ringing or in progress and answers <C>204</C>. The result still arrives by webhook.
        </P>
        <List>
          <li>
            It works for calls placed through <strong>Twilio</strong> or{" "}
            <strong>Vobiz</strong>. For an Exotel call it returns <C>400</C>, because Exotel offers no way to end a call through its API; the
            call ends at the flow&apos;s time limit.
          </li>
          <li>
            For a call that has already ended, the response is <C>204</C> and nothing happens.
          </li>
        </List>
      </Section>
    </Article>
  );
}
