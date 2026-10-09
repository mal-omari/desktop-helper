import { load } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type AppSettings } from "./types";

const STORE_PATH = "settings.json";

export async function loadSettings(): Promise<AppSettings> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  const saved = (await store.get<Partial<AppSettings>>("app")) ?? {};
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...saved };

  const envKey = import.meta.env.VITE_DESKTOP_HELPER_LLM_API_KEY;
  if (!merged.apiKey && typeof envKey === "string" && envKey.length > 0) {
    merged.apiKey = envKey;
  }

  return merged;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  await store.set("app", settings);
  await store.save();
}
