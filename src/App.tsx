import { useCallback, useState } from "react";
import { ChatView } from "./components/ChatView";
import { SettingsView } from "./components/SettingsView";
import { TitleBar } from "./components/TitleBar";
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";
import { useNavigateListener, useSettings } from "./hooks/useSettings";
import { useWindowPersistence } from "./hooks/useWindowPersistence";
import "./App.css";

function App() {
  const { settings, setSettings, loaded } = useSettings();
  const [view, setView] = useState<"chat" | "settings">("chat");

  useNavigateListener(setView);
  useGlobalShortcut(settings, loaded);
  useWindowPersistence(settings, (x, y) => {
    void setSettings((prev) => ({ ...prev, windowX: x, windowY: y }));
  });

  const togglePin = useCallback(() => {
    void setSettings((prev) => ({ ...prev, pinned: !prev.pinned }));
  }, [setSettings]);

  if (!loaded) {
    return (
      <div className="app-shell loading">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ opacity: settings.windowOpacity }}>
      <TitleBar
        view={view}
        pinned={settings.pinned}
        onNavigate={setView}
        onTogglePin={togglePin}
      />
      <main className="app-main">
        {view === "chat" ? (
          <ChatView settings={settings} />
        ) : (
          <SettingsView settings={settings} onChange={setSettings} />
        )}
      </main>
    </div>
  );
}

export default App;
