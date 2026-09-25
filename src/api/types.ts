import type * as Wire from "./bindings";
import type {
  AudioCompositionId,
  AudioListId,
  AudioObjectId,
  CampaignId,
  CompositionLayerId,
  SceneId,
  SceneLevelId,
  SessionId,
  SessionSceneId,
} from "@/types";

type Override<T, TFields> = Omit<T, keyof TFields> & TFields;

export type AppErrorDto = Wire.AppErrorDto;
export type AppSettingsDto = Wire.AppSettingsDto;
export type AudioAssetDto = Wire.AudioAssetDto;
export type AudioAssetScanWarningDto = Wire.AudioAssetScanWarningDto;
export type AudioListSelectionModeDto = Wire.AudioListSelectionModeDto;
export type AudioMixerSettingsDto = Wire.AudioMixerSettingsDto;
export type DisableBehaviorDto = Wire.DisableBehaviorDto;
export type LayerExecutionDto = Wire.LayerExecutionDto;
export type LayerExecutionInputDto = Wire.LayerExecutionInputDto;

export type AudioObjectDto = Override<
  Wire.AudioObjectDto,
  { id: AudioObjectId }
>;
export type AudioObjectInputDto = Wire.AudioObjectInputDto;

export type AudioListEntryDto = Override<
  Wire.AudioListEntryDto,
  { audioObjectId: AudioObjectId }
>;
export type AudioListEntryInputDto = Override<
  Wire.AudioListEntryInputDto,
  { audioObjectId: AudioObjectId }
>;
export type AudioListDto = Override<
  Wire.AudioListDto,
  { id: AudioListId; entries: AudioListEntryDto[] }
>;
export type AudioListInputDto = Override<
  Wire.AudioListInputDto,
  { entries: AudioListEntryInputDto[] }
>;

type BrandedCompositionLayerSource<T> = T extends {
  kind: "audioObject";
  audioObjectId: string;
}
  ? Override<T, { audioObjectId: AudioObjectId }>
  : T extends { kind: "audioList"; audioListId: string }
    ? Override<T, { audioListId: AudioListId }>
    : never;

export type CompositionLayerSourceDto =
  BrandedCompositionLayerSource<Wire.CompositionLayerSourceDto>;
export type CompositionLayerSourceInputDto =
  BrandedCompositionLayerSource<Wire.CompositionLayerSourceInputDto>;
export type CompositionLayerDto = Override<
  Wire.CompositionLayerDto,
  {
    id: CompositionLayerId;
    source: CompositionLayerSourceDto;
  }
>;
export type CompositionLayerInputDto = Override<
  Wire.CompositionLayerInputDto,
  {
    id: CompositionLayerId | null;
    source: CompositionLayerSourceInputDto;
  }
>;
export type AudioCompositionDto = Override<
  Wire.AudioCompositionDto,
  { id: AudioCompositionId; layers: CompositionLayerDto[] }
>;
export type AudioCompositionInputDto = Override<
  Wire.AudioCompositionInputDto,
  { layers: CompositionLayerInputDto[] }
>;

export type AudioLibraryDto = Override<
  Wire.AudioLibraryDto,
  {
    objects: AudioObjectDto[];
    lists: AudioListDto[];
    compositions: AudioCompositionDto[];
  }
>;

export type CampaignDto = Override<
  Wire.CampaignDto,
  { id: CampaignId; sessions: SessionDto[] }
>;
export type SessionDto = Override<
  Wire.SessionDto,
  {
    id: SessionId;
    campaignId: CampaignId;
    scenes: SessionSceneDto[];
  }
>;
export type SessionSceneDto = Override<
  Wire.SessionSceneDto,
  {
    id: SessionSceneId;
    sessionId: SessionId;
    sceneId: SceneId;
  }
>;
export type SceneDto = Override<
  Wire.SceneDto,
  { id: SceneId; levels: SceneLevelDto[] }
>;
export type SceneLevelDto = Override<
  Wire.SceneLevelDto,
  { id: SceneLevelId; sceneId: SceneId }
>;
export type CoreSnapshotDto = Override<
  Wire.CoreSnapshotDto,
  { campaigns: CampaignDto[]; scenes: SceneDto[] }
>;

export type SceneAudioConfigurationDto = Override<
  Wire.SceneAudioConfigurationDto,
  {
    sceneId: SceneId;
    audioObjectIds: AudioObjectId[];
    audioListIds: AudioListId[];
    audioCompositionIds: AudioCompositionId[];
  }
>;
export type SceneLevelAudioConfigurationDto = Override<
  Wire.SceneLevelAudioConfigurationDto,
  {
    sceneLevelId: SceneLevelId;
    disabledLayerIds: CompositionLayerId[];
  }
>;

export type PublicIpc<T> = T extends Wire.CoreSnapshotDto
  ? CoreSnapshotDto
  : T extends Wire.AudioLibraryDto
    ? AudioLibraryDto
    : T extends Wire.SceneAudioConfigurationDto
      ? SceneAudioConfigurationDto
      : T extends Wire.SceneLevelAudioConfigurationDto
        ? SceneLevelAudioConfigurationDto
        : T;
