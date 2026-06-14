export type AudioFileCategory = "music" | "ambient" | "effect" | "audio";

export type AvailableAudioFile = {
  id: string;
  name: string;
  path: string;
  category: AudioFileCategory;
  extension: string;
};

export type AudioRegionConfig = {
  startSeconds: number;
  endSeconds?: number;
};

export type AudioLoopRegionConfig = {
  enabled: boolean;
  startSeconds: number;
  endSeconds?: number;
};

export type AudioObjectConfig = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  filePath: string;
  defaultVolume: number;
  fadeInMs: number;
  fadeOutMs: number;
  playableRegion: AudioRegionConfig;
  loopRegion: AudioLoopRegionConfig;
};

export type AudioObjectListConfig = {
  id: string;
  name: string;
  description: string;
  audioObjectIds: string[];
};

export const AUDIO_MIXER_STORE_SCHEMA_VERSION = 1 as const;

export type AudioMixerStore = {
  schemaVersion: typeof AUDIO_MIXER_STORE_SCHEMA_VERSION;
  audioObjects: AudioObjectConfig[];
  audioObjectLists: AudioObjectListConfig[];
};
