// Provider-neutral shape of one agent turn. The conversation keeps history in
// these types; each provider maps them to its own wire format.

export type LlmMessage =
  | {
      role: "user";
      text: string;
      // Result of the tool call made in the preceding assistant message.
      toolResult?: { id: string; content: string };
    }
  | {
      role: "assistant";
      text: string;
      // The provider's own content blocks, replayed unchanged on later turns.
      raw?: unknown;
    };

export interface LlmTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmTurnRequest {
  system: string;
  messages: LlmMessage[];
  tool: LlmTool;
  // Answer in words only: the tool is offered but may not be called.
  noTool?: boolean;
  signal: AbortSignal;
  onText: (delta: string) => void;
}

export interface LlmTurnResult {
  text: string;
  raw: unknown;
  toolCall?: { id: string; input: unknown };
  refused: boolean;
}

export interface LlmProvider {
  runTurn(request: LlmTurnRequest): Promise<LlmTurnResult>;
}
