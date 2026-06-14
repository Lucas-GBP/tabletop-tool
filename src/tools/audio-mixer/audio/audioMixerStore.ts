import { invoke } from "@tauri-apps/api/core";
import { AUDIO_MIXER_STORE_SCHEMA_VERSION, type AudioMixerStore } from "./types";

export const emptyAudioMixerStore = (): AudioMixerStore => ({
  schemaVersion: AUDIO_MIXER_STORE_SCHEMA_VERSION,
  audioObjects: [],
  audioObjectLists: [],
});

export async function loadAudioMixerStore(): Promise<AudioMixerStore> {
  return ensureSupportedStore(await invoke<AudioMixerStore>("load_audio_mixer_store"));
}

export async function saveAudioMixerStore(store: AudioMixerStore): Promise<void> {
  await invoke("save_audio_mixer_store", {
    store: ensureSupportedStore(store),
  });
}

function ensureSupportedStore(store: AudioMixerStore): AudioMixerStore {
  if (store.schemaVersion !== AUDIO_MIXER_STORE_SCHEMA_VERSION) {
    throw new Error(`Versao nao suportada da biblioteca de audio: ${String(store.schemaVersion)}`);
  }

  return store;
}
