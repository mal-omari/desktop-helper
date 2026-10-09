import type { AppSettings, ChatMessage, ToolCall } from "../types";
import { TOOL_DEFINITIONS } from "./tools";

interface StreamHandlers {
  onToken: (token: string) => void;
  onToolCalls: (calls: ToolCall[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export async function streamOllamaChat(
  settings: AppSettings,
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${normalizeBaseUrl(settings.baseUrl)}/api/chat`;
  const payload = {
    model: settings.model,
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: TOOL_DEFINITIONS.map((t) => ({
      type: "function",
      function: t.function,
    })),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    handlers.onError(`Ollama error ${response.status}: ${body}`);
    return;
  }

  if (!response.body) {
    handlers.onError("Empty response body");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const pendingCalls: ToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line) as {
          message?: {
            content?: string;
            tool_calls?: Array<{
              function?: { name?: string; arguments?: Record<string, unknown> };
            }>;
          };
          done?: boolean;
        };
        if (chunk.message?.content) handlers.onToken(chunk.message.content);
        if (chunk.message?.tool_calls) {
          chunk.message.tool_calls.forEach((tc, i) => {
            if (!tc.function?.name) return;
            pendingCalls.push({
              id: `ollama-${Date.now()}-${i}`,
              name: tc.function.name,
              arguments: tc.function.arguments ?? {},
            });
          });
        }
        if (chunk.done && pendingCalls.length > 0) {
          handlers.onToolCalls(pendingCalls.splice(0, pendingCalls.length));
        }
      } catch {
        // ignore
      }
    }
  }

  if (pendingCalls.length > 0) handlers.onToolCalls(pendingCalls);
  handlers.onDone();
}
