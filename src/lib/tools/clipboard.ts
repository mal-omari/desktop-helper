import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

export async function readClipboard(): Promise<string> {
  return (await readText()) ?? "";
}

export async function writeClipboard(text: string): Promise<void> {
  await writeText(text);
}
