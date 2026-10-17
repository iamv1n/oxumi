"use client";

import { JsonBlock, SampleBlock } from "@oxumi/ui/docs/CodeBlock";
import { type TopicContext, type TopicName, TOPICS } from "./topics";
import { MethodBadge } from "./ui";

// A named topic rendered as request and response together, in the reader's
// chosen language. Give it a context to show a project's own values.
export function SamplePanel({
  topic,
  context,
  title,
  response = true,
  picker = true,
  clip,
}: {
  topic: TopicName;
  context?: TopicContext;
  // Replaces the header that names the method and path.
  title?: string;
  // Whether to show the response under the request.
  response?: boolean;
  // Whether the request header carries its own language menu.
  picker?: boolean;
  // Lines of the response to show before a "show all" control.
  clip?: number;
}) {
  const sample = TOPICS[topic](context);
  const heading =
    title ??
    (sample.request ? (
      <>
        <MethodBadge $method={sample.request.method} $small>
          {sample.request.method === "DELETE" ? "DEL" : sample.request.method}
        </MethodBadge>{" "}
        {sample.request.path}
      </>
    ) : (
      sample.title
    ));
  return (
    <>
      <SampleBlock samples={sample.code} title={heading} picker={picker} />
      {response && sample.response && (
        <JsonBlock
          value={sample.response.body}
          status={sample.response.status}
          title={sample.response.title}
          provenance={sample.response.provenance}
          clip={clip}
        />
      )}
    </>
  );
}
