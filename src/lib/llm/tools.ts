import type { ToolCall } from "../types";

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "read_clipboard",
      description: "Read the current text from the system clipboard.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_clipboard",
      description:
        "Prepare text to copy to the clipboard. Requires user confirmation in the UI before writing.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to copy" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "append_note",
      description: "Append a line to the local scratchpad markdown file.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Note text to append" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_shell",
      description:
        "Prepare a shell command to run. Requires explicit user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to run" },
        },
        required: ["command"],
      },
    },
  },
];

export function parseEmbeddedToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /```tool\s*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as {
        name: string;
        arguments?: Record<string, unknown>;
      };
      calls.push({
        id: `embedded-${index++}`,
        name: parsed.name,
        arguments: parsed.arguments ?? {},
      });
    } catch {
      // ignore malformed blocks
    }
  }
  return calls;
}
