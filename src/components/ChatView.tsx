import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/llm";
import {
  confirmClipboardWrite,
  executeToolCall,
  extractToolCallsFromAssistant,
  handleSlashCommand,
  systemPrompt,
  type ToolExecutionResult,
} from "../lib/orchestrator";
import { runApprovedShell } from "../lib/tools/shell";
import type { AppSettings, ChatMessage } from "../lib/types";
import { PendingActions } from "./PendingActions";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function renderMarkdown(content: string) {
  const html = marked.parse(content, { async: false }) as string;
  return { __html: DOMPurify.sanitize(html) };
}

interface ChatViewProps {
  settings: AppSettings;
}

export function ChatView({ settings }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingClipboard, setPendingClipboard] = useState<string>();
  const [pendingShell, setPendingShell] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingClipboard, pendingShell]);

  function pushMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  function updateAssistant(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  async function applyToolResult(result: ToolExecutionResult) {
    if (result.kind === "pending_clipboard") {
      setPendingClipboard(result.text);
      return "Waiting for your approval to copy to clipboard.";
    }
    if (result.kind === "pending_shell") {
      setPendingShell(result.command);
      return "Waiting for your approval to run the command.";
    }
    return result.message;
  }

  async function runAssistantTurn(history: ChatMessage[]) {
    const assistantId = uid();
    pushMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    });

    abortRef.current = new AbortController();
    let content = "";

    await streamChat(
      settings,
      [systemPrompt(), ...history],
      {
        onToken: (token) => {
          content += token;
          updateAssistant(assistantId, { content, streaming: true });
        },
        onToolCalls: (calls) => {
          void (async () => {
            for (const call of calls) {
              const result = await executeToolCall(call);
              const msg = await applyToolResult(result);
              pushMessage({
                id: uid(),
                role: "tool",
                content: `[${call.name}] ${msg}`,
              });
            }
          })();
        },
        onError: (message) => {
          updateAssistant(assistantId, {
            content: content || `Error: ${message}`,
            streaming: false,
          });
          setBusy(false);
        },
        onDone: async () => {
          updateAssistant(assistantId, { streaming: false });
          const embedded = extractToolCallsFromAssistant(content);
          for (const call of embedded) {
            const result = await executeToolCall(call);
            const msg = await applyToolResult(result);
            pushMessage({
              id: uid(),
              role: "tool",
              content: `[${call.name}] ${msg}`,
            });
          }
          setBusy(false);
        },
      },
      abortRef.current.signal,
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    pushMessage(userMsg);

    const slash = await handleSlashCommand(text);
    if (slash) {
      const msg = await applyToolResult(slash);
      pushMessage({ id: uid(), role: "assistant", content: msg });
      setBusy(false);
      return;
    }

    const history = [...messages, userMsg].filter((m) => m.role !== "system");
    await runAssistantTurn(history);
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
  }

  return (
    <div className="chat-view">
      <div className="messages">
        {messages.length === 0 && (
          <p className="empty-hint">
            Ask anything, or try <code>/clip read</code>, <code>/note hello</code>,{" "}
            <code>/run echo hi</code>
          </p>
        )}
        {messages.map((m) => (
          <article key={m.id} className={`msg msg-${m.role}`}>
            <span className="msg-role">{m.role}</span>
            {m.role === "assistant" ? (
              <div
                className="msg-body markdown"
                dangerouslySetInnerHTML={renderMarkdown(m.content || "…")}
              />
            ) : (
              <div className="msg-body">{m.content}</div>
            )}
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <PendingActions
        pendingClipboard={pendingClipboard}
        pendingShell={pendingShell}
        onConfirmClipboard={() => {
          if (pendingClipboard == null) return;
          void confirmClipboardWrite(pendingClipboard).then((msg) => {
            pushMessage({ id: uid(), role: "assistant", content: msg });
            setPendingClipboard(undefined);
          });
        }}
        onCancelClipboard={() => setPendingClipboard(undefined)}
        onConfirmShell={() => {
          if (pendingShell == null) return;
          const cmd = pendingShell;
          setPendingShell(undefined);
          void runApprovedShell(cmd).then((result) => {
            const body = [
              `exit ${result.code}`,
              result.stdout && `stdout:\n${result.stdout}`,
              result.stderr && `stderr:\n${result.stderr}`,
            ]
              .filter(Boolean)
              .join("\n\n");
            pushMessage({ id: uid(), role: "assistant", content: body || "(no output)" });
          });
        }}
        onCancelShell={() => setPendingShell(undefined)}
      />

      <form className="composer" onSubmit={(e) => void onSubmit(e)}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "Working…" : "Message or /command"}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
        <button type="button" className="secondary" onClick={clearChat}>
          Clear
        </button>
      </form>
    </div>
  );
}
