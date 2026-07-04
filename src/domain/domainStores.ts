import { tabletopDatabase } from "../database/TabletopDatabase";
import type { AudioCompositionStore } from "./index";
import type { InitiativeStore } from "./index";
import type { SceneStore } from "./index";
import type { SessionStore } from "./index";

export const AUDIO_COMPOSITION_STORE_SCHEMA_VERSION = 1 as const;
export const INITIATIVE_STORE_SCHEMA_VERSION = 1 as const;
export const SCENE_STORE_SCHEMA_VERSION = 1 as const;
export const SESSION_STORE_SCHEMA_VERSION = 1 as const;

type VersionedStore = {
  schemaVersion: number;
};

export function createEntityId(prefix: string): string {
  return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

export const emptyAudioCompositionStore = (): AudioCompositionStore => ({
  schemaVersion: AUDIO_COMPOSITION_STORE_SCHEMA_VERSION,
  audioCompositions: [],
});

export const emptyInitiativeStore = (): InitiativeStore => ({
  schemaVersion: INITIATIVE_STORE_SCHEMA_VERSION,
  encounters: [],
});

export const emptySceneStore = (): SceneStore => ({
  schemaVersion: SCENE_STORE_SCHEMA_VERSION,
  scenes: [],
});

export const emptySessionStore = (): SessionStore => ({
  schemaVersion: SESSION_STORE_SCHEMA_VERSION,
  sessions: [],
});

export async function loadAudioCompositionStore(): Promise<AudioCompositionStore> {
  return ensureSupportedStore(
    await tabletopDatabase.loadAudioCompositionStore(),
    AUDIO_COMPOSITION_STORE_SCHEMA_VERSION,
    "composicoes de audio"
  );
}

export async function saveAudioCompositionStore(store: AudioCompositionStore): Promise<void> {
  await tabletopDatabase.saveAudioCompositionStore(
    ensureSupportedStore(store, AUDIO_COMPOSITION_STORE_SCHEMA_VERSION, "composicoes de audio")
  );
}

export async function loadInitiativeStore(): Promise<InitiativeStore> {
  return ensureSupportedStore(
    await tabletopDatabase.loadInitiativeStore(),
    INITIATIVE_STORE_SCHEMA_VERSION,
    "iniciativa"
  );
}

export async function saveInitiativeStore(store: InitiativeStore): Promise<void> {
  await tabletopDatabase.saveInitiativeStore(
    ensureSupportedStore(store, INITIATIVE_STORE_SCHEMA_VERSION, "iniciativa")
  );
}

export async function loadSceneStore(): Promise<SceneStore> {
  return ensureSupportedStore(
    await tabletopDatabase.loadSceneStore(),
    SCENE_STORE_SCHEMA_VERSION,
    "cenas"
  );
}

export async function saveSceneStore(store: SceneStore): Promise<void> {
  await tabletopDatabase.saveSceneStore(
    ensureSupportedStore(store, SCENE_STORE_SCHEMA_VERSION, "cenas")
  );
}

export async function loadSessionStore(): Promise<SessionStore> {
  return ensureSupportedStore(
    await tabletopDatabase.loadSessionStore(),
    SESSION_STORE_SCHEMA_VERSION,
    "sessoes"
  );
}

export async function saveSessionStore(store: SessionStore): Promise<void> {
  await tabletopDatabase.saveSessionStore(
    ensureSupportedStore(store, SESSION_STORE_SCHEMA_VERSION, "sessoes")
  );
}

function ensureSupportedStore<TStore extends VersionedStore>(
  store: TStore,
  supportedVersion: number,
  label: string
): TStore {
  if (store.schemaVersion !== supportedVersion) {
    throw new Error(`Versao nao suportada de ${label}: ${String(store.schemaVersion)}`);
  }

  return store;
}
