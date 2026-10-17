import Anthropic from "@anthropic-ai/sdk";
import type {
  LlmMessage,
  LlmProvider,
  LlmTurnRequest,
  LlmTurnResult,
} from "./types";

type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaContentBlockParam = Anthropic.Beta.Messages.BetaContentBlockParam;

function toParam(message: LlmMessage): BetaMessageParam {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      // Replay the model's own blocks (thinking included) exactly as received.
      content: (message.raw as BetaContentBlockParam[] | undefined) ?? [
        { type: "text", text: message.text },
      ],
    };
  }
  const content: BetaContentBlockParam[] = [];
  if (message.toolResult) {
    content.push({
      type: "tool_result",
      tool_use_id: message.toolResult.id,
      content: message.toolResult.content,
    });
  }
  content.push({ type: "text", text: message.text });
  return { role: "user", content };
}

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;

  constructor(
    private model: string,
    apiKey: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async runTurn(request: LlmTurnRequest): Promise<LlmTurnResult> {
    // Server-side refusal fallback is not offered on Haiku.
    const fallback = /^claude-(opus-5|sonnet-5-5)/.test(this.model)
      ? {
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default" as const,
        }
      : {};

    // Thinking runs before the first spoken word. Sonnet 5.5 can skip it
    // ("between_tools"). Haiku 5.5 is left thinking: with it disabled, about
    // one reply in six spoke its plan aloud ("Opening in Hindi, as
    // instructed: ..."). Opus 5.5 always thinks; low effort keeps it short.
    const thinking = /^claude-sonnet-5-5/.test(this.model)
      ? { thinking: { type: "between_tools" as const } }
      : {};

    const stream = this.client.beta.messages.stream(
      {
        model: this.model,
        max_tokens: 4096,
        // Voice turns are short and latency-bound; keep reasoning shallow.
        output_config: { effort: "low" },
        ...thinking,
        ...(request.noTool ? { tool_choice: { type: "none" as const } } : {}),
        cache_control: { type: "ephemeral" },
        system: request.system,
        messages: request.messages.map(toParam),
        tools: [
          {
            name: request.tool.name,
            description: request.tool.description,
            input_schema: request.tool
              .inputSchema as Anthropic.Beta.Messages.BetaTool.InputSchema,
            eager_input_streaming: true,
          },
        ],
        ...fallback,
      },
      { signal: request.signal },
    );
    stream.on("text", (delta) => request.onText(delta));

    const message = await stream.finalMessage();
    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
    const toolUse = message.content.find((block) => block.type === "tool_use");
    return {
      text,
      raw: message.content,
      refused: message.stop_reason === "refusal",
      // A tool input cut off by max_tokens can parse yet be incomplete.
      toolCall:
        toolUse && message.stop_reason !== "max_tokens"
          ? { id: toolUse.id, input: toolUse.input }
          : undefined,
    };
  }
}
