import { invoke } from "@tauri-apps/api/core";

export interface ShellResult {
  stdout: string;
  stderr: string;
  code: number;
}

export async function runApprovedShell(command: string): Promise<ShellResult> {
  return invoke<ShellResult>("run_approved_shell", { command });
}
