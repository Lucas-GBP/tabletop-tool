import type {
  AudioCompositionDto,
  AudioAssetDto,
  AudioLibraryDto,
  AudioListDto,
  AudioObjectDto,
  CompositionLayerDto,
  SceneAudioConfigurationDto,
  SceneLevelAudioConfigurationDto,
} from "@/api";

export type PlaybackId = string;

export type PlaybackState =
  "playing" | "pausing" | "paused" | "finishing" | "stopping" | "finished";

export interface PlaybackInfo {
  readonly id: PlaybackId;
  readonly audioObjectId: string;
  readonly name: string;
  readonly state: PlaybackState;
  readonly positionUs: number;
}

export type AudioCueReference =
  | { readonly kind: "audioObject"; readonly id: string }
  | { readonly kind: "audioList"; readonly id: string };

export interface AudioDefinitions {
  readonly files: readonly AudioAssetDto[];
  readonly objects: readonly AudioObjectDto[];
  readonly lists: readonly AudioListDto[];
  readonly compositions: readonly AudioCompositionDto[];
}

export interface SceneAudioRuntimeDefinition {
  readonly scene: SceneAudioConfigurationDto;
  readonly levels: readonly SceneLevelAudioConfigurationDto[];
  readonly definitions: AudioDefinitions;
}

export interface LayerRuntimeInfo {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly persistentEnabled: boolean;
  readonly runtimeOverride: boolean | null;
}

export interface CompositionRuntimeInfo {
  readonly id: string;
  readonly name: string;
  readonly layers: readonly LayerRuntimeInfo[];
}

export interface SceneAudioRuntimeSnapshot {
  readonly sceneId: string;
  readonly currentLevelId: string;
  readonly started: boolean;
  readonly disposed: boolean;
  readonly cues: readonly AudioCueReference[];
  readonly compositions: readonly CompositionRuntimeInfo[];
}

export type RuntimeAudioObject = AudioObjectDto;
export type RuntimeAudioList = AudioListDto;
export type RuntimeAudioFile = AudioAssetDto;
export type RuntimeComposition = AudioCompositionDto;
export type RuntimeCompositionLayer = CompositionLayerDto;
export type RuntimeAudioLibrary = AudioLibraryDto;

export interface TimerDriver {
  set(callback: () => void, delayMs: number): number;
  clear(id: number): void;
}

export const browserTimer: TimerDriver = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: (id) => window.clearTimeout(id),
};
