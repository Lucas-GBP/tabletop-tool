import type { SceneDto, SceneLevelDto } from "../../../shared/api";
import { RuntimeTransitionError } from "./RuntimeTransitionError";

export interface SceneRuntimeSnapshot {
  sceneId: string;
  currentLevel: SceneLevelDto;
  disposed: boolean;
}

export class SceneRuntime {
  readonly sceneId: string;
  readonly #levels: SceneLevelDto[];
  #currentLevelId: string;
  #disposed = false;

  constructor(scene: SceneDto) {
    const levels = [...scene.levels].sort(
      (left, right) => left.position - right.position,
    );
    const firstLevel = levels[0];
    if (!firstLevel) {
      throw new RuntimeTransitionError(
        "SCENE_HAS_NO_LEVELS",
        "A cena não possui um nível que possa ser executado.",
      );
    }

    this.sceneId = scene.id;
    this.#levels = levels;
    this.#currentLevelId = firstLevel.id;
  }

  get disposed() {
    return this.#disposed;
  }

  get snapshot(): SceneRuntimeSnapshot {
    const currentLevel = this.#levels.find(
      (level) => level.id === this.#currentLevelId,
    );
    if (!currentLevel) {
      throw new RuntimeTransitionError(
        "ACTIVE_LEVEL_NOT_FOUND",
        "O nível ativo da cena não está disponível.",
      );
    }

    return {
      sceneId: this.sceneId,
      currentLevel,
      disposed: this.#disposed,
    };
  }

  switchLevel(levelId: string) {
    this.#ensureActive();
    if (!this.#levels.some((level) => level.id === levelId)) {
      throw new RuntimeTransitionError(
        "LEVEL_NOT_IN_SCENE",
        "O nível selecionado não pertence à cena em execução.",
      );
    }
    this.#currentLevelId = levelId;
  }

  dispose() {
    this.#disposed = true;
  }

  #ensureActive() {
    if (this.#disposed) {
      throw new RuntimeTransitionError(
        "SCENE_RUNTIME_DISPOSED",
        "A execução desta cena já foi encerrada.",
      );
    }
  }
}
