import type {
  AudioCompositionId,
  AudioListId,
  AudioObjectId,
  CampaignId,
  CompositionLayerId,
  PlaybackId,
  SceneId,
  SceneLevelId,
  SessionId,
  SessionSceneId,
} from "@/types";

function asTestId<TId extends string>(value: string): TId {
  return value as TId;
}

export const testId = {
  audioComposition: asTestId<AudioCompositionId>,
  audioList: asTestId<AudioListId>,
  audioObject: asTestId<AudioObjectId>,
  campaign: asTestId<CampaignId>,
  compositionLayer: asTestId<CompositionLayerId>,
  playback: asTestId<PlaybackId>,
  scene: asTestId<SceneId>,
  sceneLevel: asTestId<SceneLevelId>,
  session: asTestId<SessionId>,
  sessionScene: asTestId<SessionSceneId>,
} as const;
