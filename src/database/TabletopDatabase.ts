import { invoke } from "@tauri-apps/api/core";
import type { AudioCompositionStore } from "../bindings/tauri/AudioCompositionStore";
import type { AudioMixerStore } from "../bindings/tauri/AudioMixerStore";
import type { InitiativeStore } from "../bindings/tauri/InitiativeStore";
import type { SceneStore } from "../bindings/tauri/SceneStore";
import type { SessionStore } from "../bindings/tauri/SessionStore";

export class TabletopDatabase {
  async loadAudioCompositionStore(): Promise<AudioCompositionStore> {
    return this.query<AudioCompositionStore>("load_audio_composition_store");
  }

  async saveAudioCompositionStore(store: AudioCompositionStore): Promise<void> {
    await this.execute("save_audio_composition_store", { store });
  }

  async loadAudioMixerStore(): Promise<AudioMixerStore> {
    return this.query<AudioMixerStore>("load_audio_mixer_store");
  }

  async saveAudioMixerStore(store: AudioMixerStore): Promise<void> {
    await this.execute("save_audio_mixer_store", { store });
  }

  async loadInitiativeStore(): Promise<InitiativeStore> {
    return this.query<InitiativeStore>("load_initiative_store");
  }

  async saveInitiativeStore(store: InitiativeStore): Promise<void> {
    await this.execute("save_initiative_store", { store });
  }

  async loadSceneStore(): Promise<SceneStore> {
    return this.query<SceneStore>("load_scene_store");
  }

  async saveSceneStore(store: SceneStore): Promise<void> {
    await this.execute("save_scene_store", { store });
  }

  async loadSessionStore(): Promise<SessionStore> {
    return this.query<SessionStore>("load_session_store");
  }

  async saveSessionStore(store: SessionStore): Promise<void> {
    await this.execute("save_session_store", { store });
  }

  private query<TResult>(command: string, args?: Record<string, unknown>): Promise<TResult> {
    return invoke<TResult>(command, args);
  }

  private execute(command: string, args?: Record<string, unknown>): Promise<void> {
    return invoke(command, args);
  }
}

export const tabletopDatabase = new TabletopDatabase();
