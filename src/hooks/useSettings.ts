import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "../lib/settings";
import type { AppSettings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(
    async (next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
      setSettings((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        void saveSettings(resolved);
        return resolved;
      });
    },
    [],
  );

  return { settings, setSettings: persist, loaded };
}

export function useNavigateListener(onNavigate: (view: "chat" | "settings") => void) {
  useEffect(() => {
    const unlisten = listen<string>("navigate", (event) => {
      if (event.payload === "settings" || event.payload === "chat") {
        onNavigate(event.payload);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onNavigate]);
}
