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

async function unwrapQuery<T>(result: Promise<CommandResult<T>>): Promise<T> {
  return unwrapResult(await withTimeout(result));
}

async function unwrapMutation<T>(
  result: Promise<CommandResult<T>>,
): Promise<T> {
  return unwrapResult(await result);
}

async function unwrapLongQuery<T>(
  result: Promise<CommandResult<T>>,
): Promise<T> {
  return unwrapResult(await result);
}

function unwrapResult<T>(response: CommandResult<T>): T {
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
  listCore: () => unwrapQuery(commands.listCore()),
  createScene: (name: string) => unwrapMutation(commands.createScene(name)),
  createCampaign: (name: string) =>
    unwrapMutation(commands.createCampaign(name)),
  createSession: (campaignId: string, name: string, initialSceneId: string) =>
    unwrapMutation(commands.createSession(campaignId, name, initialSceneId)),
  createSceneLevel: (sceneId: string, name: string) =>
    unwrapMutation(commands.createSceneLevel(sceneId, name)),
  renameCampaign: (campaignId: string, name: string) =>
    unwrapMutation(commands.renameCampaign(campaignId, name)),
  renameSession: (sessionId: string, name: string) =>
    unwrapMutation(commands.renameSession(sessionId, name)),
  renameScene: (sceneId: string, name: string) =>
    unwrapMutation(commands.renameScene(sceneId, name)),
  renameSceneLevel: (levelId: string, name: string) =>
    unwrapMutation(commands.renameSceneLevel(levelId, name)),
  moveSession: (sessionId: string, position: number) =>
    unwrapMutation(commands.moveSession(sessionId, position)),
  moveScene: (sessionId: string, sceneId: string, position: number) =>
    unwrapMutation(commands.moveScene(sessionId, sceneId, position)),
  moveSceneLevel: (levelId: string, position: number) =>
    unwrapMutation(commands.moveSceneLevel(levelId, position)),
  associateScene: (sessionId: string, sceneId: string) =>
    unwrapMutation(commands.associateScene(sessionId, sceneId)),
  deleteCampaign: (campaignId: string) =>
    unwrapMutation(commands.deleteCampaign(campaignId)),
  deleteSession: (sessionId: string) =>
    unwrapMutation(commands.deleteSession(sessionId)),
  deleteScene: (sceneId: string) =>
    unwrapMutation(commands.deleteScene(sceneId)),
  deleteSceneLevel: (levelId: string) =>
    unwrapMutation(commands.deleteSceneLevel(levelId)),
  removeSceneFromSession: (sessionId: string, sceneId: string) =>
    unwrapMutation(commands.removeSceneFromSession(sessionId, sceneId)),
  listAudioLibrary: () => unwrapLongQuery(commands.listAudioLibrary()),
  getAppSettings: () => unwrapQuery(commands.getAppSettings()),
  configureAssetDirectory: (directory: string) =>
    unwrapMutation(commands.configureAssetDirectory(directory)),
  resolveAssetPath: (relativePath: string) =>
    unwrapQuery(commands.resolveAssetPath(relativePath)),
  createAudioObject: (input: AudioObjectInputDto) =>
    unwrapMutation(commands.createAudioObject(input)),
  updateAudioObject: (audioObjectId: string, input: AudioObjectInputDto) =>
    unwrapMutation(commands.updateAudioObject(audioObjectId, input)),
  deleteAudioObject: (audioObjectId: string) =>
    unwrapMutation(commands.deleteAudioObject(audioObjectId)),
  createAudioList: (input: AudioListInputDto) =>
    unwrapMutation(commands.createAudioList(input)),
  updateAudioList: (audioListId: string, input: AudioListInputDto) =>
    unwrapMutation(commands.updateAudioList(audioListId, input)),
  deleteAudioList: (audioListId: string) =>
    unwrapMutation(commands.deleteAudioList(audioListId)),
  createAudioComposition: (input: AudioCompositionInputDto) =>
    unwrapMutation(commands.createAudioComposition(input)),
  updateAudioComposition: (
    audioCompositionId: string,
    input: AudioCompositionInputDto,
  ) =>
    unwrapMutation(commands.updateAudioComposition(audioCompositionId, input)),
  deleteAudioComposition: (audioCompositionId: string) =>
    unwrapMutation(commands.deleteAudioComposition(audioCompositionId)),
  updateAudioMixerSettings: (masterVolumeDb: number) =>
    unwrapMutation(commands.updateAudioMixerSettings({ masterVolumeDb })),
  getSceneAudioConfiguration: (sceneId: string) =>
    unwrapQuery(commands.getSceneAudioConfiguration(sceneId)),
  updateSceneAudioConfiguration: (
    sceneId: string,
    audioObjectIds: string[],
    audioListIds: string[],
    audioCompositionIds: string[],
  ) =>
    unwrapMutation(
      commands.updateSceneAudioConfiguration(
        sceneId,
        audioObjectIds,
        audioListIds,
        audioCompositionIds,
      ),
    ),
  getSceneLevelAudioConfiguration: (sceneLevelId: string) =>
    unwrapQuery(commands.getSceneLevelAudioConfiguration(sceneLevelId)),
  updateSceneLevelAudioConfiguration: (
    sceneLevelId: string,
    disabledLayerIds: string[],
  ) =>
    unwrapMutation(
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
