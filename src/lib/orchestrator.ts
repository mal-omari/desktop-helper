import { parseEmbeddedToolCalls } from "./llm/tools";
import { readClipboard, writeClipboard } from "./tools/clipboard";
import { appendNote } from "./tools/notes";
import type { ChatMessage, ToolCall } from "./types";

export type ToolExecutionResult =
  | { kind: "result"; message: string }
  | { kind: "pending_clipboard"; text: string }
  | { kind: "pending_shell"; command: string };

export async function handleSlashCommand(
  input: string,
): Promise<ToolExecutionResult | null> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (cmd.toLowerCase()) {
    case "/clip": {
      if (arg === "read" || arg === "") {
        const text = await readClipboard();
        return { kind: "result", message: text || "(clipboard empty)" };
      }
      if (arg.startsWith("write ")) {
        const text = arg.slice("write ".length);
        return { kind: "pending_clipboard", text };
      }
      return {
        kind: "result",
        message: "Usage: /clip read | /clip write <text>",
      };
    }
    case "/note": {
      if (!arg) return { kind: "result", message: "Usage: /note <text>" };
      const path = await appendNote(arg);
      return { kind: "result", message: `Appended to ${path}` };
    }
    case "/run": {
      if (!arg) return { kind: "result", message: "Usage: /run <command>" };
      return { kind: "pending_shell", command: arg };
    }
    default:
      return {
        kind: "result",
        message: `Unknown command ${cmd}. Try /clip, /note, /run`,
      };
  }
}

export async function executeToolCall(
  call: ToolCall,
): Promise<ToolExecutionResult> {
  switch (call.name) {
    case "read_clipboard": {
      const text = await readClipboard();
      return { kind: "result", message: text || "(clipboard empty)" };
    }
    case "write_clipboard": {
      const text = String(call.arguments.text ?? "");
      return { kind: "pending_clipboard", text };
    }
    case "append_note": {
      const text = String(call.arguments.text ?? "");
      const path = await appendNote(text);
      return { kind: "result", message: `Appended to ${path}` };
    }
    case "run_shell": {
      const command = String(call.arguments.command ?? "");
      return { kind: "pending_shell", command };
    }
    default:
      return { kind: "result", message: `Unknown tool: ${call.name}` };
  }
}

export function extractToolCallsFromAssistant(content: string): ToolCall[] {
  return parseEmbeddedToolCalls(content);
}

export function systemPrompt(): ChatMessage {
  return {
    id: "system",
    role: "system",
    content:
      "You are Desktop Helper, a concise assistant on the user's desktop. " +
      "Use tools when helpful. For shell or clipboard writes, use the appropriate tool so the user can confirm. " +
      "Keep answers short unless asked for detail.",
  };
}

export async function confirmClipboardWrite(text: string): Promise<string> {
  await writeClipboard(text);
  return "Copied to clipboard.";
}
