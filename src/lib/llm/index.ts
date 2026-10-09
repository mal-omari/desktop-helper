import type { AppSettings, ChatMessage, ToolCall } from "../types";
import { streamOllamaChat } from "./ollama";
import { streamOpenAiChat } from "./openai";

export interface StreamHandlers {
  onToken: (token: string) => void;
  onToolCalls: (calls: ToolCall[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChat(
  settings: AppSettings,
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (settings.provider === "ollama") {
    await streamOllamaChat(settings, messages, handlers, signal);
  } else {
    await streamOpenAiChat(settings, messages, handlers, signal);
  }
}
