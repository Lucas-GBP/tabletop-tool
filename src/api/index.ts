import { commands } from "./bindings";
import type {
  AppErrorDto,
  AudioCompositionInputDto,
  AudioListInputDto,
  AudioObjectInputDto,
} from "./bindings";

type CommandResult<T> =
  { status: "ok"; data: T } | { status: "error"; error: AppErrorDto };

const commandTimeoutMs = 10_000;

export class ApplicationError extends Error {
  readonly details: AppErrorDto;

  constructor(details: AppErrorDto) {
    super(details.message);
    this.name = "ApplicationError";
    this.details = details;
  }
}

export class ApplicationTimeoutError extends Error {
  constructor() {
    super("A operação local demorou mais que o esperado.");
    this.name = "ApplicationTimeoutError";
  }
}

async function unwrap<T>(result: Promise<CommandResult<T>>): Promise<T> {
  const response = await withTimeout(result);
  if (response.status === "error") {
    throw new ApplicationError(response.error);
  }
  return response.data;
}

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new ApplicationTimeoutError()),
      commandTimeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

// Keep generated IPC details at this boundary, outside visual components.
export const api = {
  listCore: () => unwrap(commands.listCore()),
  createScene: (name: string) => unwrap(commands.createScene(name)),
  createCampaign: (name: string) => unwrap(commands.createCampaign(name)),
  createSession: (campaignId: string, name: string, initialSceneId: string) =>
    unwrap(commands.createSession(campaignId, name, initialSceneId)),
  createSceneLevel: (sceneId: string, name: string) =>
    unwrap(commands.createSceneLevel(sceneId, name)),
  renameCampaign: (campaignId: string, name: string) =>
    unwrap(commands.renameCampaign(campaignId, name)),
  renameSession: (sessionId: string, name: string) =>
    unwrap(commands.renameSession(sessionId, name)),
  renameScene: (sceneId: string, name: string) =>
    unwrap(commands.renameScene(sceneId, name)),
  renameSceneLevel: (levelId: string, name: string) =>
    unwrap(commands.renameSceneLevel(levelId, name)),
  associateScene: (sessionId: string, sceneId: string) =>
    unwrap(commands.associateScene(sessionId, sceneId)),
  deleteCampaign: (campaignId: string) =>
    unwrap(commands.deleteCampaign(campaignId)),
  deleteSession: (sessionId: string) =>
    unwrap(commands.deleteSession(sessionId)),
  deleteScene: (sceneId: string) => unwrap(commands.deleteScene(sceneId)),
  deleteSceneLevel: (levelId: string) =>
    unwrap(commands.deleteSceneLevel(levelId)),
  removeSceneFromSession: (sessionId: string, sceneId: string) =>
    unwrap(commands.removeSceneFromSession(sessionId, sceneId)),
  listAudioLibrary: () => unwrap(commands.listAudioLibrary()),
  getAppSettings: () => unwrap(commands.getAppSettings()),
  configureAssetDirectory: (directory: string) =>
    unwrap(commands.configureAssetDirectory(directory)),
  resolveAssetPath: (relativePath: string) =>
    unwrap(commands.resolveAssetPath(relativePath)),
  createAudioObject: (input: AudioObjectInputDto) =>
    unwrap(commands.createAudioObject(input)),
  updateAudioObject: (audioObjectId: string, input: AudioObjectInputDto) =>
    unwrap(commands.updateAudioObject(audioObjectId, input)),
  deleteAudioObject: (audioObjectId: string) =>
    unwrap(commands.deleteAudioObject(audioObjectId)),
  createAudioList: (input: AudioListInputDto) =>
    unwrap(commands.createAudioList(input)),
  updateAudioList: (audioListId: string, input: AudioListInputDto) =>
    unwrap(commands.updateAudioList(audioListId, input)),
  deleteAudioList: (audioListId: string) =>
    unwrap(commands.deleteAudioList(audioListId)),
  createAudioComposition: (input: AudioCompositionInputDto) =>
    unwrap(commands.createAudioComposition(input)),
  updateAudioComposition: (
    audioCompositionId: string,
    input: AudioCompositionInputDto,
  ) => unwrap(commands.updateAudioComposition(audioCompositionId, input)),
  deleteAudioComposition: (audioCompositionId: string) =>
    unwrap(commands.deleteAudioComposition(audioCompositionId)),
  updateAudioMixerSettings: (masterVolumeDb: number) =>
    unwrap(commands.updateAudioMixerSettings({ masterVolumeDb })),
  getSceneAudioConfiguration: (sceneId: string) =>
    unwrap(commands.getSceneAudioConfiguration(sceneId)),
  updateSceneAudioConfiguration: (
    sceneId: string,
    audioObjectIds: string[],
    audioListIds: string[],
    audioCompositionIds: string[],
  ) =>
    unwrap(
      commands.updateSceneAudioConfiguration(
        sceneId,
        audioObjectIds,
        audioListIds,
        audioCompositionIds,
      ),
    ),
  getSceneLevelAudioConfiguration: (sceneLevelId: string) =>
    unwrap(commands.getSceneLevelAudioConfiguration(sceneLevelId)),
  updateSceneLevelAudioConfiguration: (
    sceneLevelId: string,
    disabledLayerIds: string[],
  ) =>
    unwrap(
      commands.updateSceneLevelAudioConfiguration(
        sceneLevelId,
        disabledLayerIds,
      ),
    ),
};

export type {
  AppErrorDto,
  AppSettingsDto,
  AudioAssetDto,
  AudioCompositionDto,
  AudioCompositionInputDto,
  AudioLibraryDto,
  AudioListDto,
  AudioListEntryDto,
  AudioListEntryInputDto,
  AudioListInputDto,
  AudioListSelectionModeDto,
  AudioMixerSettingsDto,
  AudioObjectDto,
  AudioObjectInputDto,
  CampaignDto,
  CompositionLayerDto,
  CompositionLayerInputDto,
  CompositionLayerSourceDto,
  CompositionLayerSourceInputDto,
  CoreSnapshotDto,
  DisableBehaviorDto,
  LayerExecutionDto,
  LayerExecutionInputDto,
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
  SceneLevelDto,
  SessionDto,
  SessionSceneDto,
} from "./bindings";
