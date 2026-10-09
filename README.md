# Desktop Helper

A lightweight desktop assistant that lives in your system tray and opens with a global shortcut. Chat with a local **Ollama** model or any **OpenAI-compatible** API, use slash commands, and run tools (clipboard, scratchpad notes, shell) with explicit approval for sensitive actions.

## Features

- System tray icon (left-click toggles window; menu: Open, Settings, Quit)
- Global shortcut default: `CommandOrControl+Shift+Space`
- Frameless, draggable chat window with optional **Pin** (always on top) and opacity slider
- Streaming LLM responses with markdown rendering
- Tools: read/write clipboard (write requires confirm), append scratchpad, run shell (requires confirm)
- Slash commands: `/clip read`, `/clip write <text>`, `/note <text>`, `/run <command>`
- Settings persisted locally (Tauri store)

## Prerequisites

### All platforms

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.90+ (`rust-toolchain.toml` in this repo)

### Linux (Tauri)

Install WebKitGTK and related libraries. On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for other distros and Wayland notes.

## Setup

```bash
npm install
```

### LLM configuration

**Ollama (default)** — run [Ollama](https://ollama.com/) and pull a model, e.g. `ollama pull llama3.2`. Defaults in Settings:

- Base URL: `http://127.0.0.1:11434`
- Model: `llama3.2`

**OpenAI-compatible** — switch provider in Settings, set base URL (e.g. `https://api.openai.com`) and model. Optional API key:

- In Settings, or
- Environment variable at build time: `VITE_DESKTOP_HELPER_LLM_API_KEY`

## Development

```bash
npm run tauri dev
```

Ensure `~/.cargo/bin` is on your `PATH` if you use rustup alongside a system Rust install.

## Production build

```bash
npm run tauri build
```

Installers/binaries are under `src-tauri/target/release/bundle/`.

## Security model

- **Shell**: Commands are never executed until you click **Run** in the approval card.
- **Clipboard writes**: Require **Copy** confirmation.
- **Secrets**: Stored in the local Tauri store (or env for API key); only sent to your configured LLM endpoint.
- **No telemetry** in v1.

## Shortcut troubleshooting (Wayland)

Some compositors restrict global shortcuts. If registration fails, Settings shows a warning — use the **tray icon** to open the assistant. See Tauri docs for your desktop environment.

## Project structure

| Path | Purpose |
|------|---------|
| `src/` | React UI (chat, settings, orchestrator) |
| `src/lib/llm/` | Ollama and OpenAI-compatible streaming clients |
| `src/lib/orchestrator.ts` | Slash commands and tool execution |
| `src-tauri/src/lib.rs` | Tray, scratchpad, approved shell IPC |

## License

MIT (default Tauri template — adjust as needed)
