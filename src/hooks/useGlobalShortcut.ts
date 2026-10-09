import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isRegistered,
  register,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { useEffect } from "react";
import type { AppSettings } from "../lib/types";

async function toggleWindow() {
  const window = getCurrentWindow();
  const visible = await window.isVisible();
  if (visible) {
    await window.hide();
  } else {
    await window.show();
    await window.setFocus();
  }
}

export function useGlobalShortcut(settings: AppSettings, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const shortcut = settings.globalShortcut;

    async function setup() {
      try {
        if (await isRegistered(shortcut)) {
          await unregister(shortcut);
        }
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            void toggleWindow();
          }
        });
        if (!cancelled) {
          await invoke("set_shortcut_registered", { registered: true });
        }
      } catch (err) {
        console.error("Global shortcut registration failed:", err);
        await invoke("set_shortcut_registered", { registered: false });
      }
    }

    void setup();

    return () => {
      cancelled = true;
      unregister(shortcut).catch(() => {});
      invoke("set_shortcut_registered", { registered: false }).catch(() => {});
    };
  }, [settings.globalShortcut, enabled]);
}
