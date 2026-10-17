"use client";

import { CodeBlock, SampleBlock } from "@oxumi/ui/docs/CodeBlock";
import { BACKOFF_SAMPLES } from "@oxumi/ui/docs/backoff";
import { Article, C, Facts, List, Note, P, PageTitle, Section, Table } from "../ui";

// Both responses exactly as the API sent them.
const LIMITED = `HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 16
Retry-After: 16
Content-Type: application/json; charset=utf-8

{"statusCode":429,"message":"Rate limit of 120 requests per minute exceeded."}`;

const NORMAL = `HTTP/1.1 200 OK
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 60
Content-Type: application/json; charset=utf-8`;

export default function RateLimits() {
  return (
    <Article>
      <PageTitle kicker="Guide" title="Rate limits">
        Each API key may make 120 requests per minute. Every response tells you how many you have
        left, and a refused request tells you how long to wait.
      </PageTitle>

      <Section
        id="limit"
        title="The limit"
        aside={
          <Facts
            title="How requests are counted"
            rows={[
              ["Limit", "120 requests per minute"],
              ["Counted per", "API key; two keys are counted separately"],
              ["Window", "Fixed: 60 seconds from a key's first request"],
              ["Counts", "Every request with a valid key, including ones that fail or are refused"],
              ["Does not count", "Requests without a valid key (401)"],
              ["Kept", "In one server instance's memory"],
            ]}
          />
        }
      >
        <P>
          The limit is per key, not per project. A minute starts with a key&apos;s first request
          and lasts 60 seconds; the count then starts again at zero. It is a fixed window, not a
          rolling one.
        </P>
        <Note title="Counted per server instance">
          <p>
            The counters live in the memory of the server that handled the request, and start
            again if it restarts. Treat the headers as the truth for the response you are
            holding, not as a guarantee about the next one.
          </p>
        </Note>
      </Section>

      <Section
        id="headers"
        title="Headers"
        aside={<CodeBlock title="A normal response" language="http" code={NORMAL} provenance="captured" />}
      >
        <P>Every response to a request with a valid key carries three headers.</P>
        <Table
          head={["Header", "Value"]}
          rows={[
            [<C key="h">X-RateLimit-Limit</C>, "The limit: 120."],
            [<C key="h">X-RateLimit-Remaining</C>, "Requests left in the current window."],
            [
              <C key="h">X-RateLimit-Reset</C>,
              "Seconds until the window ends. A duration, not a timestamp.",
            ],
            [
              <C key="h">Retry-After</C>,
              <>
                Only on <C>429</C>. The same number of seconds as <C>X-RateLimit-Reset</C>.
              </>,
            ],
          ]}
        />
      </Section>

      <Section
        id="handling"
        title="Handling 429"
        aside={
          <>
            <SampleBlock samples={BACKOFF_SAMPLES} title="Wait and retry" picker={false} />
            <CodeBlock title="Over the limit" language="http" code={LIMITED} provenance="captured" />
          </>
        }
      >
        <P>
          When a request is refused, wait the number of seconds in <C>Retry-After</C> and send
          it again. Nothing was done with the refused request, so repeating it is safe.
        </P>
        <List>
          <li>
            Add a little random delay if several workers share a key, so they do not all retry
            in the same instant.
          </li>
          <li>Give up after a few attempts and report the failure, instead of looping forever.</li>
          <li>
            Better still, stay under the limit: watch <C>X-RateLimit-Remaining</C> and slow down
            as it approaches zero. Waiting for webhooks instead of polling{" "}
            <C>GET /v1/calls/:id</C> removes most of the requests an integration makes.
          </li>
        </List>
      </Section>
    </Article>
  );
}
