import type { Page } from "@playwright/test";
import type { AudioCompositionStore } from "../../src/bindings/tauri/AudioCompositionStore";
import type { AudioFile } from "../../src/bindings/tauri/AudioFile";
import type { AudioMixerStore } from "../../src/bindings/tauri/AudioMixerStore";
import type { InitiativeStore } from "../../src/bindings/tauri/InitiativeStore";
import type { SceneStore } from "../../src/bindings/tauri/SceneStore";
import type { SessionStore } from "../../src/bindings/tauri/SessionStore";

export type TabletopMockStores = {
  audioMixer: AudioMixerStore;
  audioComposition: AudioCompositionStore;
  initiative: InitiativeStore;
  scene: SceneStore;
  session: SessionStore;
};

declare global {
  interface Window {
    __tabletopTestStores: TabletopMockStores;
    __tabletopTestInvokes: Array<{ cmd: string; args: { store?: unknown } }>;
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: { store?: unknown }) => Promise<unknown>;
    };
  }
}

type InstallMockOptions = {
  stores?: TabletopMockStores;
  audioFiles?: AudioFile[];
};

export const sampleAudioFiles = [
  {
    id: "file-rain",
    name: "Chuva de teste",
    path: "/audio/test-rain.mp3",
    category: "ambience",
    extension: "mp3",
  },
  {
    id: "file-door",
    name: "Porta de teste",
    path: "/audio/test-door.mp3",
    category: "effect",
    extension: "mp3",
  },
] satisfies AudioFile[];

export function emptyMockStores(): TabletopMockStores {
  return {
    audioMixer: {
      schemaVersion: 1,
      audioObjects: [],
      audioObjectLists: [],
    },
    audioComposition: {
      schemaVersion: 1,
      audioCompositions: [],
    },
    initiative: {
      schemaVersion: 1,
      encounters: [],
    },
    scene: {
      schemaVersion: 1,
      scenes: [],
    },
    session: {
      schemaVersion: 1,
      sessions: [],
    },
  };
}

export async function installTauriMock(page: Page, options: InstallMockOptions = {}) {
  await page.addInitScript(
    ({ initialStores, initialAudioFiles }) => {
      type InvokeArgs = {
        store?: unknown;
      };
      type TestWindow = Window &
        typeof globalThis & {
          __tabletopTestStores: TabletopMockStores;
          __tabletopTestInvokes: Array<{ cmd: string; args: InvokeArgs }>;
          __TAURI_INTERNALS__: {
            invoke: (cmd: string, args?: InvokeArgs) => Promise<unknown>;
          };
        };

      const testWindow = window as TestWindow;
      const clone = <TValue>(value: TValue): TValue =>
        value === undefined ? value : JSON.parse(JSON.stringify(value));
      const stores = clone(initialStores);
      const audioFiles = clone(initialAudioFiles);

      testWindow.__tabletopTestStores = stores;
      testWindow.__tabletopTestInvokes = [];
      testWindow.__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args: InvokeArgs = {}) => {
          testWindow.__tabletopTestInvokes.push({ cmd, args: clone(args) });

          switch (cmd) {
            case "list_audio_files":
              return clone(audioFiles);
            case "load_audio_mixer_store":
              return clone(stores.audioMixer);
            case "save_audio_mixer_store":
              stores.audioMixer = clone(args.store as AudioMixerStore);
              testWindow.__tabletopTestStores = stores;
              return undefined;
            case "load_audio_composition_store":
              return clone(stores.audioComposition);
            case "save_audio_composition_store":
              stores.audioComposition = clone(args.store as AudioCompositionStore);
              testWindow.__tabletopTestStores = stores;
              return undefined;
            case "load_initiative_store":
              return clone(stores.initiative);
            case "save_initiative_store":
              stores.initiative = clone(args.store as InitiativeStore);
              testWindow.__tabletopTestStores = stores;
              return undefined;
            case "load_scene_store":
              return clone(stores.scene);
            case "save_scene_store":
              stores.scene = clone(args.store as SceneStore);
              testWindow.__tabletopTestStores = stores;
              return undefined;
            case "load_session_store":
              return clone(stores.session);
            case "save_session_store":
              stores.session = clone(args.store as SessionStore);
              testWindow.__tabletopTestStores = stores;
              return undefined;
            default:
              throw new Error(`Unhandled invoke: ${cmd}`);
          }
        },
      };

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.includes("/audio/")) {
          return new Response(new ArrayBuffer(16), { status: 200 });
        }

        return originalFetch(input, init);
      };

      class MockAudioContext {
        state = "running";
        currentTime = 0;
        destination = {};

        async resume() {
          this.state = "running";
        }

        async close() {}

        async decodeAudioData() {
          const length = 12_000;

          return {
            duration: 12,
            length,
            numberOfChannels: 1,
            getChannelData: () => {
              const samples = new Float32Array(length);

              for (let index = 0; index < length; index += 1) {
                samples[index] = Math.sin(index / 40) * 0.55;
              }

              return samples;
            },
          };
        }

        createBufferSource() {
          return {
            buffer: null,
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            onended: null,
            connect() {},
            disconnect() {},
            start() {},
            stop() {},
          };
        }

        createGain() {
          return {
            gain: { value: 1 },
            connect() {},
            disconnect() {},
          };
        }
      }

      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: MockAudioContext,
      });
      Object.defineProperty(window, "webkitAudioContext", {
        configurable: true,
        value: MockAudioContext,
      });
    },
    {
      initialStores: options.stores ?? emptyMockStores(),
      initialAudioFiles: options.audioFiles ?? sampleAudioFiles,
    }
  );
}

export async function readMockStores(page: Page): Promise<TabletopMockStores> {
  return page.evaluate(() => {
    const testWindow = window as Window &
      typeof globalThis & {
        __tabletopTestStores: TabletopMockStores;
      };

    return testWindow.__tabletopTestStores;
  });
}
