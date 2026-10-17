import assert from "node:assert/strict";
import { test } from "node:test";
import { OpenAiCompatibleProvider } from "../src/llm/openai-compatible";

// Replays a recorded-shape Chat Completions stream through the real SDK.
function fakeEndpoint(chunks: object[]) {
  const seen: { url: string; body: any }[] = [];
  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    const body = [...chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`), "data: [DONE]\n\n"].join("");
    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof fetch;
  return { seen, fetchImpl };
}

const delta = (d: object, finish: string | null = null) => ({
  id: "c1",
  object: "chat.completion.chunk",
  choices: [{ index: 0, delta: d, finish_reason: finish }],
});

test("streams text, assembles the tool call and keeps provider extras", async () => {
  const { seen, fetchImpl } = fakeEndpoint([
    delta({ role: "assistant", content: "Theek hai. " }),
    delta({ content: "Koi dikkat?" }),
    delta({
      tool_calls: [
        {
          index: 0,
          id: "call_1",
          type: "function",
          function: { name: "record_turn", arguments: '{"fields":{"on_sch' },
          extra_content: { google: { thought_signature: "sig" } },
        },
      ],
    }),
    delta({ tool_calls: [{ index: 0, function: { arguments: 'edule":true},"signal":"none"}' } }] }),
    // A second parallel call must be dropped, not left unanswered in history.
    delta({ tool_calls: [{ index: 1, id: "call_2", function: { name: "record_turn", arguments: "{}" } }] }),
    delta({}, "tool_calls"),
  ]);
  const provider = new OpenAiCompatibleProvider({
    apiKey: "test",
    baseURL: "https://example.test/v1/",
    model: "some-model",
    fetch: fetchImpl,
  });

  const heard: string[] = [];
  const result = await provider.runTurn({
    system: "SYSTEM",
    messages: [
      { role: "user", text: "first" },
      { role: "assistant", text: "cut off [interrupted by the caller]" },
      { role: "user", text: "second", toolResult: { id: "call_0", content: "Recorded." } },
    ],
    tool: { name: "record_turn", description: "d", inputSchema: { type: "object" } },
    signal: new AbortController().signal,
    onText: (t) => heard.push(t),
  });

  assert.deepEqual(heard, ["Theek hai. ", "Koi dikkat?"]);
  assert.equal(result.text, "Theek hai. Koi dikkat?");
  assert.deepEqual(result.toolCall, {
    id: "call_1",
    input: { fields: { on_schedule: true }, signal: "none" },
  });
  const raw = result.raw as { tool_calls: any[] };
  assert.equal(raw.tool_calls.length, 1);
  assert.deepEqual(raw.tool_calls[0].extra_content, { google: { thought_signature: "sig" } });
  assert.equal("index" in raw.tool_calls[0], false);

  assert.equal(seen[0]!.url, "https://example.test/v1/chat/completions");
  assert.deepEqual(
    seen[0]!.body.messages.map((m: any) => [m.role, m.content]),
    [
      ["system", "SYSTEM"],
      ["user", "first"],
      ["assistant", "cut off [interrupted by the caller]"],
      ["tool", "Recorded."],
      ["user", "second"],
    ],
  );
  assert.equal(seen[0]!.body.tools[0].function.name, "record_turn");
});

test("unparseable tool arguments are discarded instead of recorded", async () => {
  const { fetchImpl } = fakeEndpoint([
    delta({ content: "Achha." }),
    delta({ tool_calls: [{ index: 0, id: "call_1", function: { name: "record_turn", arguments: '{"fields":' } }] }),
    delta({}, "tool_calls"),
  ]);
  const provider = new OpenAiCompatibleProvider({ apiKey: "test", model: "m", fetch: fetchImpl });
  const result = await provider.runTurn({
    system: "",
    messages: [{ role: "user", text: "hi" }],
    tool: { name: "record_turn", description: "d", inputSchema: { type: "object" } },
    signal: new AbortController().signal,
    onText: () => {},
  });
  assert.equal(result.text, "Achha.");
  assert.equal(result.toolCall, undefined);
  assert.equal("tool_calls" in (result.raw as object), false);
});
