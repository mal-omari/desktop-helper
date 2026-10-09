import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import type { AppSettings } from "../lib/types";

export function useWindowPersistence(
  settings: AppSettings,
  onSavePosition: (x: number, y: number) => void,
) {
  useEffect(() => {
    const window = getCurrentWindow();

    async function apply() {
      await window.setAlwaysOnTop(settings.pinned);
      if (settings.windowX != null && settings.windowY != null) {
        await window.setPosition(
          new LogicalPosition(settings.windowX, settings.windowY),
        );
      }
    }
    void apply();
  }, [settings.pinned, settings.windowOpacity, settings.windowX, settings.windowY]);

  useEffect(() => {
    const window = getCurrentWindow();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const unlisten = window.onMoved(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const pos = await window.outerPosition();
        onSavePosition(pos.x, pos.y);
      }, 300);
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      unlisten.then((fn) => fn());
    };
  }, [onSavePosition]);
}
