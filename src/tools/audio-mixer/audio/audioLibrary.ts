import { invoke } from "@tauri-apps/api/core";
import type { AvailableAudioFile } from "./types";

export async function loadAvailableAudioFiles(): Promise<AvailableAudioFile[]> {
  return invoke<AvailableAudioFile[]>("list_audio_files");
}
