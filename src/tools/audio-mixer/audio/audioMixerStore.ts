import { tabletopDatabase } from "../../../database/TabletopDatabase";
import { AUDIO_MIXER_STORE_SCHEMA_VERSION, type AudioMixerStore } from "./types";

export const emptyAudioMixerStore = (): AudioMixerStore => ({
  schemaVersion: AUDIO_MIXER_STORE_SCHEMA_VERSION,
  audioObjects: [],
  audioObjectLists: [],
});

export async function loadAudioMixerStore(): Promise<AudioMixerStore> {
  return ensureSupportedStore(await tabletopDatabase.loadAudioMixerStore());
}

export async function saveAudioMixerStore(store: AudioMixerStore): Promise<void> {
  await tabletopDatabase.saveAudioMixerStore(ensureSupportedStore(store));
}

function ensureSupportedStore(store: AudioMixerStore): AudioMixerStore {
  if (store.schemaVersion !== AUDIO_MIXER_STORE_SCHEMA_VERSION) {
    throw new Error(`Versao nao suportada da biblioteca de audio: ${String(store.schemaVersion)}`);
  }

  return store;
}
