import { invoke } from "@tauri-apps/api/core";
import type { AudioMixerStore } from "../bindings/tauri/AudioMixerStore";

export class TabletopDatabase {
  async loadAudioMixerStore(): Promise<AudioMixerStore> {
    return this.query<AudioMixerStore>("load_audio_mixer_store");
  }

  async saveAudioMixerStore(store: AudioMixerStore): Promise<void> {
    await this.execute("save_audio_mixer_store", { store });
  }

  private query<TResult>(command: string, args?: Record<string, unknown>): Promise<TResult> {
    return invoke<TResult>(command, args);
  }

  private execute(command: string, args?: Record<string, unknown>): Promise<void> {
    return invoke(command, args);
  }
}

export const tabletopDatabase = new TabletopDatabase();
