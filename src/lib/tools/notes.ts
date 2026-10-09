import { invoke } from "@tauri-apps/api/core";

export async function appendNote(text: string): Promise<string> {
  return invoke<string>("append_scratchpad", { text });
}

export async function readNotes(): Promise<string> {
  return invoke<string>("read_scratchpad");
}
