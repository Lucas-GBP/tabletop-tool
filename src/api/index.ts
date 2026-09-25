import { commands } from "./bindings";
import type {
  AppErrorDto,
  AudioCompositionInputDto,
  AudioListInputDto,
  AudioObjectInputDto,
  PublicIpc,
} from "./types";
import type {
  AudioCompositionId,
  AudioListId,
  AudioObjectId,
  CampaignId,
  CompositionLayerId,
  SceneId,
  SceneLevelId,
  SessionId,
} from "@/types";

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

async function unwrapQuery<T>(
  result: Promise<CommandResult<T>>,
): Promise<PublicIpc<T>> {
  return asPublicIpc(unwrapResult(await withTimeout(result)));
}

async function unwrapMutation<T>(
  result: Promise<CommandResult<T>>,
): Promise<PublicIpc<T>> {
  return asPublicIpc(unwrapResult(await result));
}

async function unwrapLongQuery<T>(
  result: Promise<CommandResult<T>>,
): Promise<PublicIpc<T>> {
  return asPublicIpc(unwrapResult(await result));
}

function asPublicIpc<T>(value: T): PublicIpc<T> {
  return value as PublicIpc<T>;
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
  createSession: (
    campaignId: CampaignId,
    name: string,
    initialSceneId: SceneId,
  ) => unwrapMutation(commands.createSession(campaignId, name, initialSceneId)),
  createSceneLevel: (sceneId: SceneId, name: string) =>
    unwrapMutation(commands.createSceneLevel(sceneId, name)),
  renameCampaign: (campaignId: CampaignId, name: string) =>
    unwrapMutation(commands.renameCampaign(campaignId, name)),
  renameSession: (sessionId: SessionId, name: string) =>
    unwrapMutation(commands.renameSession(sessionId, name)),
  renameScene: (sceneId: SceneId, name: string) =>
    unwrapMutation(commands.renameScene(sceneId, name)),
  renameSceneLevel: (levelId: SceneLevelId, name: string) =>
    unwrapMutation(commands.renameSceneLevel(levelId, name)),
  moveSession: (sessionId: SessionId, position: number) =>
    unwrapMutation(commands.moveSession(sessionId, position)),
  moveScene: (sessionId: SessionId, sceneId: SceneId, position: number) =>
    unwrapMutation(commands.moveScene(sessionId, sceneId, position)),
  moveSceneLevel: (levelId: SceneLevelId, position: number) =>
    unwrapMutation(commands.moveSceneLevel(levelId, position)),
  associateScene: (sessionId: SessionId, sceneId: SceneId) =>
    unwrapMutation(commands.associateScene(sessionId, sceneId)),
  deleteCampaign: (campaignId: CampaignId) =>
    unwrapMutation(commands.deleteCampaign(campaignId)),
  deleteSession: (sessionId: SessionId) =>
    unwrapMutation(commands.deleteSession(sessionId)),
  deleteScene: (sceneId: SceneId) =>
    unwrapMutation(commands.deleteScene(sceneId)),
  deleteSceneLevel: (levelId: SceneLevelId) =>
    unwrapMutation(commands.deleteSceneLevel(levelId)),
  removeSceneFromSession: (sessionId: SessionId, sceneId: SceneId) =>
    unwrapMutation(commands.removeSceneFromSession(sessionId, sceneId)),
  listAudioLibrary: () => unwrapLongQuery(commands.listAudioLibrary()),
  getAppSettings: () => unwrapQuery(commands.getAppSettings()),
  configureAssetDirectory: (directory: string) =>
    unwrapMutation(commands.configureAssetDirectory(directory)),
  resolveAssetPath: (relativePath: string) =>
    unwrapQuery(commands.resolveAssetPath(relativePath)),
  createAudioObject: (input: AudioObjectInputDto) =>
    unwrapMutation(commands.createAudioObject(input)),
  updateAudioObject: (
    audioObjectId: AudioObjectId,
    input: AudioObjectInputDto,
  ) => unwrapMutation(commands.updateAudioObject(audioObjectId, input)),
  deleteAudioObject: (audioObjectId: AudioObjectId) =>
    unwrapMutation(commands.deleteAudioObject(audioObjectId)),
  createAudioList: (input: AudioListInputDto) =>
    unwrapMutation(commands.createAudioList(input)),
  updateAudioList: (audioListId: AudioListId, input: AudioListInputDto) =>
    unwrapMutation(commands.updateAudioList(audioListId, input)),
  deleteAudioList: (audioListId: AudioListId) =>
    unwrapMutation(commands.deleteAudioList(audioListId)),
  createAudioComposition: (input: AudioCompositionInputDto) =>
    unwrapMutation(commands.createAudioComposition(input)),
  updateAudioComposition: (
    audioCompositionId: AudioCompositionId,
    input: AudioCompositionInputDto,
  ) =>
    unwrapMutation(commands.updateAudioComposition(audioCompositionId, input)),
  deleteAudioComposition: (audioCompositionId: AudioCompositionId) =>
    unwrapMutation(commands.deleteAudioComposition(audioCompositionId)),
  updateAudioMixerSettings: (masterVolumeDb: number) =>
    unwrapMutation(commands.updateAudioMixerSettings({ masterVolumeDb })),
  getSceneAudioConfiguration: (sceneId: SceneId) =>
    unwrapQuery(commands.getSceneAudioConfiguration(sceneId)),
  updateSceneAudioConfiguration: (
    sceneId: SceneId,
    audioObjectIds: AudioObjectId[],
    audioListIds: AudioListId[],
    audioCompositionIds: AudioCompositionId[],
  ) =>
    unwrapMutation(
      commands.updateSceneAudioConfiguration(
        sceneId,
        audioObjectIds,
        audioListIds,
        audioCompositionIds,
      ),
    ),
  getSceneLevelAudioConfiguration: (sceneLevelId: SceneLevelId) =>
    unwrapQuery(commands.getSceneLevelAudioConfiguration(sceneLevelId)),
  updateSceneLevelAudioConfiguration: (
    sceneLevelId: SceneLevelId,
    disabledLayerIds: CompositionLayerId[],
  ) =>
    unwrapMutation(
      commands.updateSceneLevelAudioConfiguration(
        sceneLevelId,
        disabledLayerIds,
      ),
    ),
};

export type * from "./types";
