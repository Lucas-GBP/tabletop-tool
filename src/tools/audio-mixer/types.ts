import type {
  AudioCompositionDto,
  AudioAssetDto,
  AudioListDto,
  AudioObjectDto,
  SceneAudioConfigurationDto,
  SceneLevelAudioConfigurationDto,
} from "@/api";
import type {
  AudioCompositionId,
  AudioListId,
  AudioObjectId,
  CompositionLayerId,
  PlaybackId,
  SceneId,
  SceneLevelId,
} from "@/types";

export type { PlaybackId } from "@/types";

export type PlaybackState =
  "playing" | "pausing" | "paused" | "finishing" | "stopping" | "finished";

export interface PlaybackInfo {
  readonly id: PlaybackId;
  readonly audioObjectId: AudioObjectId;
  readonly name: string;
  readonly state: PlaybackState;
  readonly positionUs: number;
}

export type AudioCueReference =
  | { readonly kind: "audioObject"; readonly id: AudioObjectId }
  | { readonly kind: "audioList"; readonly id: AudioListId };

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
  readonly id: CompositionLayerId;
  readonly name: string;
  readonly enabled: boolean;
  readonly persistentEnabled: boolean;
  readonly runtimeOverride: boolean | null;
}

export interface CompositionRuntimeInfo {
  readonly id: AudioCompositionId;
  readonly name: string;
  readonly layers: readonly LayerRuntimeInfo[];
}

export interface SceneAudioRuntimeSnapshot {
  readonly sceneId: SceneId;
  readonly currentLevelId: SceneLevelId;
  readonly started: boolean;
  readonly disposed: boolean;
  readonly cues: readonly AudioCueReference[];
  readonly compositions: readonly CompositionRuntimeInfo[];
}

export interface TimerDriver {
  set(callback: () => void, delayMs: number): number;
  clear(id: number): void;
}

export const browserTimer: TimerDriver = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: (id) => window.clearTimeout(id),
};
