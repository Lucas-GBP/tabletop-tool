import type { Brand } from "./brand";

export type CampaignId = Brand<string, "CampaignId">;
export type SessionId = Brand<string, "SessionId">;
export type SessionSceneId = Brand<string, "SessionSceneId">;
export type SceneId = Brand<string, "SceneId">;
export type SceneLevelId = Brand<string, "SceneLevelId">;

export type AudioObjectId = Brand<string, "AudioObjectId">;
export type AudioListId = Brand<string, "AudioListId">;
export type AudioCompositionId = Brand<string, "AudioCompositionId">;
export type CompositionLayerId = Brand<string, "CompositionLayerId">;

export type PlaybackId = Brand<string, "PlaybackId">;

export function asPlaybackId(value: string): PlaybackId {
  return value as PlaybackId;
}

export function asAudioObjectId(value: string): AudioObjectId {
  return value as AudioObjectId;
}
