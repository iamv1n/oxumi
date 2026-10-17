import OpenAI from "openai";
import type {
  LlmMessage,
  LlmProvider,
  LlmTurnRequest,
  LlmTurnResult,
} from "./types";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

export interface OpenAiCompatibleOptions {
  apiKey: string;
  model: string;
  // Omitted for OpenAI itself; set for Gemini or any compatible endpoint.
  baseURL?: string;
  fetch?: typeof fetch;
}

function toParams(message: LlmMessage): ChatMessage[] {
  if (message.role === "assistant") {
    return [
      (message.raw as ChatMessage | undefined) ?? {
        role: "assistant",
        content: message.text,
      },
    ];
  }
  const out: ChatMessage[] = [];
  if (message.toolResult) {
    out.push({
      role: "tool",
      tool_call_id: message.toolResult.id,
      content: message.toolResult.content,
    });
  }
  out.push({ role: "user", content: message.text });
  return out;
}

// Speaks the Chat Completions wire format, which OpenAI, Gemini's
// compatibility endpoint and most self-hosted gateways share.
export class OpenAiCompatibleProvider implements LlmProvider {
  private client: OpenAI;

  constructor(private opts: OpenAiCompatibleOptions) {
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
      fetch: opts.fetch,
    });
  }

  async runTurn(request: LlmTurnRequest): Promise<LlmTurnResult> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.opts.model,
        stream: true,
        messages: [
          { role: "system", content: request.system },
          ...request.messages.flatMap(toParams),
        ],
        ...(request.noTool ? { tool_choice: "none" as const } : {}),
        tools: [
          {
            type: "function",
            function: {
              name: request.tool.name,
              description: request.tool.description,
              parameters: request.tool.inputSchema,
            },
          },
        ],
      },
      { signal: request.signal },
    );

    let text = "";
    let finish: string | null = null;
    // Only the first tool call is kept: the flow needs one record per turn,
    // and every call left in history would need its own result.
    let call: (ToolCall & { function: { name: string; arguments: string } }) | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      finish = choice.finish_reason ?? finish;
      if (choice.delta.content) {
        text += choice.delta.content;
        request.onText(choice.delta.content);
      }
      for (const delta of choice.delta.tool_calls ?? []) {
        if (delta.index !== 0) continue;
        if (!call) {
          // Spread first so provider extras (e.g. Gemini's thought signature)
          // survive the round trip back into history.
          const { index: _index, ...rest } = delta;
          call = {
            ...rest,
            id: delta.id ?? "",
            type: "function",
            function: { name: "", arguments: "" },
          };
        }
        if (delta.id) call.id = delta.id;
        if (delta.function?.name) call.function.name = delta.function.name;
        call.function.arguments += delta.function?.arguments ?? "";
      }
    }

    let input: unknown;
    if (call && finish !== "length") {
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        call = undefined;
      }
    } else {
      call = undefined;
    }

    return {
      text,
      refused: finish === "content_filter",
      raw: {
        role: "assistant",
        content: text || null,
        ...(call ? { tool_calls: [call] } : {}),
      } satisfies ChatMessage,
      toolCall: call ? { id: call.id, input } : undefined,
    };
  }
}
