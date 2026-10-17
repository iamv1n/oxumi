"use client";

import Link from "next/link";
import { JsonBlock } from "@oxumi/ui/docs/CodeBlock";
import { ERRORS } from "@oxumi/ui/docs/examples";
import { Article, C, Facts, List, P, PageTitle, Section, Table } from "../ui";

export default function Errors() {
  return (
    <Article>
      <PageTitle kicker="Guide" title="Errors">
        The API uses HTTP status codes and answers every failure with a small JSON body. The
        status tells your code what to do; the message tells a person what went wrong.
      </PageTitle>

      <Section
        id="shape"
        title="Error body"
        aside={
          <>
            <JsonBlock value={ERRORS.badNumber} status={400} provenance="captured" />
            <JsonBlock value={ERRORS.rateLimited} status={429} provenance="captured" />
          </>
        }
      >
        <Table
          head={["Field", "Type", "Meaning"]}
          rows={[
            [<C key="f">message</C>, "string", "One sentence saying what was wrong."],
            [
              <C key="f">error</C>,
              "string",
              <>
                The name of the status, such as <C>Bad Request</C>. Missing on <C>429</C> and{" "}
                <C>500</C>.
              </>,
            ],
            [<C key="f">statusCode</C>, "number", "The HTTP status again."],
          ]}
        />
        <P>
          Branch on the HTTP status, not on the text of <C>message</C>. Messages are for logs
          and for people, and their wording can change.
        </P>
      </Section>

      <Section id="statuses" title="Status codes">
        <Table
          head={["Status", "Meaning", "When"]}
          rows={[
            [<C key="s">200</C>, "OK", "A read succeeded, or a message was answered."],
            [<C key="s">201</C>, "Created", <>A conversation was started (<C>POST /v1/conversations</C>).</>],
            [<C key="s">202</C>, "Accepted", <>A call was placed and is ringing (<C>POST /v1/calls</C>). The result comes later.</>],
            [<C key="s">204</C>, "No Content", "A call was hung up or a conversation ended."],
            [<C key="s">400</C>, "Bad Request", <>The request was wrong, or the project is not set up for it. See <Link href="#bad-requests">below</Link>.</>],
            [<C key="s">401</C>, "Unauthorized", <>The key is missing, malformed, unknown, expired or revoked. See <Link href="/docs/authentication#sending">Authentication</Link>.</>],
            [<C key="s">402</C>, "Payment Required", <>The project has reached its monthly spending limit (<C>code</C> is <C>spend_limit_reached</C>). An admin can raise it under Billing in the app.</>],
            [<C key="s">404</C>, "Not Found", "The agent or call does not exist in the key's project, or the path is not an endpoint."],
            [<C key="s">409</C>, "Conflict", "A conversation message arrived while the previous one was still being answered."],
            [<C key="s">410</C>, "Gone", "The conversation has ended, expired, or was lost in a restart."],
            [<C key="s">422</C>, "Unprocessable Entity", <>The agent&apos;s flow has an error and cannot run, or a phone call is not allowed by the project&apos;s compliance rules (do-not-call list, calling hours, consent). The message says why.</>],
            [<C key="s">429</C>, "Too Many Requests", <>The key made more than 120 requests in a minute. See <Link href="/docs/rate-limits">Rate limits</Link>.</>],
            [<C key="s">500</C>, "Internal Server Error", "Something unexpected failed on the server."],
            [<C key="s">502</C>, "Bad Gateway", "The language model could not be reached during a conversation. The conversation is closed."],
            [<C key="s">503</C>, "Service Unavailable", "Phone calls are unavailable because the server has no public URL configured."],
          ]}
        />
      </Section>

      <Section
        id="bad-requests"
        title="What a 400 means"
        aside={
          <>
            <JsonBlock value={ERRORS.missingVariables} status={400} provenance="captured" />
            <JsonBlock value={ERRORS.notConnected} status={400} provenance="captured" />
            <JsonBlock value={ERRORS.notUuid} status={400} provenance="captured" />
          </>
        }
      >
        <P>
          A <C>400</C> covers the most ground. It is returned when:
        </P>
        <List>
          <li>
            a required body field is missing or of the wrong type: <C>agentId</C>, <C>to</C>,{" "}
            <C>text</C>;
          </li>
          <li>
            <C>to</C> is not a number in international format;
          </li>
          <li>one of the flow&apos;s variables has no value;</li>
          <li>
            an <C>:id</C> in the path is not a UUID, or the body is not valid JSON;
          </li>
          <li>
            <C>provider</C> is not <C>twilio</C>, <C>exotel</C> or <C>vobiz</C>, or <C>model</C> is
            not{" "}
            <C>&lt;provider&gt;:&lt;model&gt;</C> naming a known provider;
          </li>
          <li>
            something the request needs is not connected: a telephony provider, a speech
            provider, or the model&apos;s provider;
          </li>
          <li>the telephony provider refused to place the call (its own message is passed on);</li>
          <li>you asked to hang up a call that was placed through Exotel.</li>
        </List>
      </Section>

      <Section
        id="known-issues"
        title="Known issues"
        aside={
          <>
            <JsonBlock value={ERRORS.internal} status={500} provenance="captured" />
            <Facts
              title="Requests that return 500 today"
              rows={[
                ["POST /v1/calls", "agentId is a string but not a UUID"],
                ["POST /v1/conversations", "agentId is a string but not a UUID"],
                ["GET /v1/calls?agentId=", "The value is not a UUID"],
              ]}
            />
          </>
        }
      >
        <P>
          This is an early build. These behaviours were found while writing these docs and are
          described as they are today, not as they should be.
        </P>
        <List>
          <li>
            <strong>A malformed agent id returns 500, not 400.</strong> The three requests on
            the right do this. A well-formed id that does not exist correctly returns{" "}
            <C>404</C>.
          </li>
          <li>
            <strong>Conversation variables are all-or-nothing.</strong> One non-string value
            makes <C>POST /v1/conversations</C> ignore every variable. See{" "}
            <Link href="/docs/conversations#start">Start a conversation</Link>.
          </li>
        </List>
      </Section>
    </Article>
  );
}
