import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  view: "chat" | "settings";
  pinned: boolean;
  onNavigate: (view: "chat" | "settings") => void;
  onTogglePin: () => void;
}

export function TitleBar({
  view,
  pinned,
  onNavigate,
  onTogglePin,
}: TitleBarProps) {
  async function hideWindow() {
    await getCurrentWindow().hide();
  }

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <span className="app-name">Desktop Helper</span>
      </div>
      <nav className="titlebar-nav">
        <button
          type="button"
          className={view === "chat" ? "active" : ""}
          onClick={() => onNavigate("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          className={view === "settings" ? "active" : ""}
          onClick={() => onNavigate("settings")}
        >
          Settings
        </button>
      </nav>
      <div className="titlebar-actions">
        <button
          type="button"
          className={pinned ? "active" : ""}
          title="Pin always on top"
          onClick={onTogglePin}
        >
          Pin
        </button>
        <button type="button" title="Hide" onClick={() => void hideWindow()}>
          −
        </button>
      </div>
    </header>
  );
}
