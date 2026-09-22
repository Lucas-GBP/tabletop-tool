import { RuntimeError } from "./RuntimeError";

export interface SceneRuntimeSnapshot {
  sceneId: string;
  currentLevelId: string;
  disposed: boolean;
}

export class SceneRuntime {
  readonly sceneId: string;
  readonly #levelIds: readonly string[];
  #currentLevelId: string;
  #disposed = false;

  constructor(sceneId: string, levelIds: readonly string[]) {
    const firstLevelId = levelIds[0];
    if (!firstLevelId) {
      throw new RuntimeError({
        code: "SCENE_HAS_NO_LEVELS",
        message: "A cena não possui um nível que possa ser executado.",
        operation: "start_scene",
        entityId: sceneId,
        details: "The runtime definition contains no SceneLevel identity.",
        recoverable: false,
      });
    }

    this.sceneId = sceneId;
    this.#levelIds = [...levelIds];
    this.#currentLevelId = firstLevelId;
  }

  get disposed() {
    return this.#disposed;
  }

  get snapshot(): SceneRuntimeSnapshot {
    return {
      sceneId: this.sceneId,
      currentLevelId: this.#currentLevelId,
      disposed: this.#disposed,
    };
  }

  switchLevel(levelId: string) {
    this.#ensureActive();
    if (!this.#levelIds.includes(levelId)) {
      throw new RuntimeError({
        code: "LEVEL_NOT_IN_SCENE",
        message: "O nível selecionado não pertence à cena em execução.",
        operation: "switch_scene_level",
        entityId: levelId,
        details: `Scene ${this.sceneId} does not contain SceneLevel ${levelId}.`,
        recoverable: true,
      });
    }
    this.#currentLevelId = levelId;
  }

  dispose() {
    this.#disposed = true;
  }

  #ensureActive() {
    if (this.#disposed) {
      throw new RuntimeError({
        code: "SCENE_RUNTIME_DISPOSED",
        message: "A execução desta cena já foi encerrada.",
        operation: "transition_scene_runtime",
        entityId: this.sceneId,
        details: "A command targeted a disposed SceneRuntime.",
        recoverable: false,
      });
    }
  }
}
