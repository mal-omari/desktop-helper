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

export async function streamOpenAiChat(
  settings: AppSettings,
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${normalizeBaseUrl(settings.baseUrl)}/v1/chat/completions`;
  const payload = {
    model: settings.model,
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto" as const,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    handlers.onError(`LLM error ${response.status}: ${body}`);
    return;
  }

  if (!response.body) {
    handlers.onError("Empty response body");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCalls = new Map<number, ToolCall>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string;
              tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }>;
            };
          }>;
        };
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) handlers.onToken(delta.content);
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.get(tc.index) ?? {
              id: tc.id ?? `call-${tc.index}`,
              name: "",
              arguments: {},
            };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) {
              const prev =
                (existing.arguments as { _raw?: string })._raw ?? "";
              (existing.arguments as { _raw: string })._raw =
                prev + tc.function.arguments;
            }
            toolCalls.set(tc.index, existing);
          }
        }
      } catch {
        // skip bad chunks
      }
    }
  }

  const finalized: ToolCall[] = [];
  for (const tc of toolCalls.values()) {
    const raw = (tc.arguments as { _raw?: string })._raw ?? "{}";
    try {
      tc.arguments = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      tc.arguments = { command: raw, text: raw };
    }
    finalized.push(tc);
  }
  if (finalized.length > 0) handlers.onToolCalls(finalized);
  handlers.onDone();
}
