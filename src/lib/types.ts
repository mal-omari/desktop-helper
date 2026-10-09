export type LlmProvider = "ollama" | "openai";

export interface AppSettings {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  globalShortcut: string;
  pinned: boolean;
  windowOpacity: number;
  windowX?: number;
  windowY?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  streaming?: boolean;
}

export interface PendingShellAction {
  command: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "ollama",
  baseUrl: "http://127.0.0.1:11434",
  model: "llama3.2",
  apiKey: "",
  globalShortcut: "CommandOrControl+Shift+Space",
  pinned: false,
  windowOpacity: 1,
};
