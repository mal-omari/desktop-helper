import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { AppSettings, LlmProvider } from "../lib/types";

interface SettingsViewProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function SettingsView({ settings, onChange }: SettingsViewProps) {
  const [shortcutOk, setShortcutOk] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<boolean>("is_shortcut_registered").then(setShortcutOk).catch(() => setShortcutOk(false));
  }, [settings.globalShortcut]);

  function patch(partial: Partial<AppSettings>) {
    onChange({ ...settings, ...partial });
  }

  return (
    <div className="settings-view">
      <section>
        <h2>LLM</h2>
        <label>
          Provider
          <select
            value={settings.provider}
            onChange={(e) => patch({ provider: e.target.value as LlmProvider })}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openai">OpenAI-compatible</option>
          </select>
        </label>
        <label>
          Base URL
          <input
            value={settings.baseUrl}
            onChange={(e) => patch({ baseUrl: e.target.value })}
            placeholder="http://127.0.0.1:11434"
          />
        </label>
        <label>
          Model
          <input
            value={settings.model}
            onChange={(e) => patch({ model: e.target.value })}
          />
        </label>
        {settings.provider === "openai" && (
          <label>
            API key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              placeholder="Or set VITE_DESKTOP_HELPER_LLM_API_KEY"
            />
          </label>
        )}
      </section>

      <section>
        <h2>Window</h2>
        <label>
          Global shortcut
          <input
            value={settings.globalShortcut}
            onChange={(e) => patch({ globalShortcut: e.target.value })}
          />
        </label>
        <p className="hint">
          Default: CommandOrControl+Shift+Space. On Wayland, registration may fail — use the tray
          icon to open the assistant.
        </p>
        {shortcutOk === false && (
          <p className="warn">Shortcut not registered. Open from the system tray instead.</p>
        )}
        <label>
          Opacity ({Math.round(settings.windowOpacity * 100)}%)
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={settings.windowOpacity}
            onChange={(e) => patch({ windowOpacity: Number(e.target.value) })}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.pinned}
            onChange={(e) => patch({ pinned: e.target.checked })}
          />
          Pin window (always on top)
        </label>
      </section>

      <section>
        <h2>Security</h2>
        <ul className="security-list">
          <li>Shell commands never run without your approval.</li>
          <li>Clipboard writes require confirmation.</li>
          <li>API keys stay in local store or env — not sent anywhere except your LLM endpoint.</li>
        </ul>
      </section>
    </div>
  );
}
