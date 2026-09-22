import { RuntimeError } from "./RuntimeError";
import { SceneRuntime } from "./SceneRuntime";

export interface RuntimeScene {
  readonly associationId: string;
  readonly position: number;
  readonly sceneId: string;
}

export interface SessionRuntimeDefinition {
  readonly id: string;
  readonly scenes: readonly RuntimeScene[];
}

export interface SceneRuntimeDefinition {
  readonly id: string;
  readonly levelIds: readonly string[];
}

export interface SessionRuntimeSnapshot {
  readonly sessionId: string;
  readonly scenes: readonly RuntimeScene[];
  readonly currentSceneIndex: number;
  readonly currentScene: RuntimeScene;
  readonly sceneRuntime: SceneRuntime["snapshot"];
}

export class SessionRuntime {
  readonly sessionId: string;
  readonly #scenes: readonly RuntimeScene[];
  readonly #levelIdsByScene: ReadonlyMap<string, readonly string[]>;
  #currentSceneIndex = 0;
  #sceneRuntime: SceneRuntime;
  #disposed = false;

  constructor(
    session: SessionRuntimeDefinition,
    scenes: readonly SceneRuntimeDefinition[],
  ) {
    this.#levelIdsByScene = new Map(
      scenes.map((scene) => [scene.id, [...scene.levelIds]]),
    );
    this.#scenes = [...session.scenes]
      .sort((left, right) => left.position - right.position)
      .map((association) => ({ ...association }));

    for (const runtimeScene of this.#scenes) {
      this.#levelsFor(runtimeScene.sceneId);
    }

    const firstScene = this.#scenes[0];
    if (!firstScene) {
      throw new RuntimeError({
        code: "SESSION_HAS_NO_SCENES",
        message: "A sessão não possui uma cena que possa ser executada.",
        operation: "start_session",
        entityId: session.id,
        details: "The runtime definition contains no SessionScene identity.",
        recoverable: false,
      });
    }

    this.sessionId = session.id;
    this.#sceneRuntime = new SceneRuntime(
      firstScene.sceneId,
      this.#levelsFor(firstScene.sceneId),
    );
  }

  get activeSceneRuntime() {
    return this.#sceneRuntime;
  }

  get snapshot(): SessionRuntimeSnapshot {
    const currentScene = this.#scenes[this.#currentSceneIndex];
    if (!currentScene) {
      throw new RuntimeError({
        code: "ACTIVE_SCENE_NOT_FOUND",
        message: "A cena ativa da sessão não está disponível.",
        operation: "read_session_runtime",
        entityId: this.sessionId,
        details: `No SessionScene exists at index ${this.#currentSceneIndex}.`,
        recoverable: false,
      });
    }

    return {
      sessionId: this.sessionId,
      scenes: this.#scenes,
      currentSceneIndex: this.#currentSceneIndex,
      currentScene,
      sceneRuntime: this.#sceneRuntime.snapshot,
    };
  }

  switchScene(sceneId: string) {
    this.#ensureActive();
    const nextIndex = this.#scenes.findIndex(
      (runtimeScene) => runtimeScene.sceneId === sceneId,
    );
    if (nextIndex < 0) {
      throw new RuntimeError({
        code: "SCENE_NOT_IN_SESSION",
        message: "A cena selecionada não pertence à sessão em execução.",
        operation: "switch_session_scene",
        entityId: sceneId,
        details: `Session ${this.sessionId} does not reference Scene ${sceneId}.`,
        recoverable: true,
      });
    }
    if (nextIndex === this.#currentSceneIndex) return;

    const nextScene = this.#scenes[nextIndex]!;
    const nextRuntime = new SceneRuntime(
      nextScene.sceneId,
      this.#levelsFor(nextScene.sceneId),
    );
    this.#sceneRuntime.dispose();
    this.#currentSceneIndex = nextIndex;
    this.#sceneRuntime = nextRuntime;
  }

  switchLevel(levelId: string) {
    this.#ensureActive();
    this.#sceneRuntime.switchLevel(levelId);
  }

  dispose() {
    if (this.#disposed) return;
    this.#sceneRuntime.dispose();
    this.#disposed = true;
  }

  #levelsFor(sceneId: string) {
    const levelIds = this.#levelIdsByScene.get(sceneId);
    if (!levelIds) {
      throw new RuntimeError({
        code: "SESSION_SCENE_NOT_FOUND",
        message: "Uma cena desta sessão não está disponível.",
        operation: "start_session",
        entityId: sceneId,
        details: `No Scene definition was provided for Scene ${sceneId}.`,
        recoverable: false,
      });
    }
    if (levelIds.length === 0) {
      throw new RuntimeError({
        code: "SCENE_HAS_NO_LEVELS",
        message: "A cena não possui um nível que possa ser executado.",
        operation: "start_session",
        entityId: sceneId,
        details:
          "The Scene runtime definition contains no SceneLevel identity.",
        recoverable: false,
      });
    }
    return levelIds;
  }

  #ensureActive() {
    if (this.#disposed) {
      throw new RuntimeError({
        code: "SESSION_RUNTIME_DISPOSED",
        message: "A execução desta sessão já foi encerrada.",
        operation: "transition_session_runtime",
        entityId: this.sessionId,
        details: "A command targeted a disposed SessionRuntime.",
        recoverable: false,
      });
    }
  }
}
