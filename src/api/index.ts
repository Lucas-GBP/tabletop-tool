import { commands } from "./bindings";
import type { AppErrorDto } from "./bindings";

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
};

export type {
  AppErrorDto,
  CampaignDto,
  CoreSnapshotDto,
  SceneDto,
  SceneLevelDto,
  SessionDto,
  SessionSceneDto,
} from "./bindings";
