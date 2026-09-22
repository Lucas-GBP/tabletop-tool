import type { SceneDto, SessionDto } from "@/api";
import { RuntimeTransitionError } from "./RuntimeTransitionError";
import { SceneRuntime } from "./SceneRuntime";

export interface RuntimeScene {
  associationId: string;
  position: number;
  scene: SceneDto;
}

export interface SessionRuntimeSnapshot {
  sessionId: string;
  scenes: RuntimeScene[];
  currentSceneIndex: number;
  currentScene: RuntimeScene;
  sceneRuntime: SceneRuntime["snapshot"];
}

export class SessionRuntime {
  readonly sessionId: string;
  readonly #scenes: RuntimeScene[];
  #currentSceneIndex = 0;
  #sceneRuntime: SceneRuntime;
  #disposed = false;

  constructor(session: SessionDto, availableScenes: SceneDto[]) {
    const scenesById = new Map(
      availableScenes.map((scene) => [scene.id, scene]),
    );
    this.#scenes = [...session.scenes]
      .sort((left, right) => left.position - right.position)
      .map((association) => {
        const scene = scenesById.get(association.sceneId);
        if (!scene) {
          throw new RuntimeTransitionError(
            "SESSION_SCENE_NOT_FOUND",
            "Uma cena desta sessão não está disponível.",
          );
        }
        return {
          associationId: association.id,
          position: association.position,
          scene,
        };
      });

    const firstScene = this.#scenes[0];
    if (!firstScene) {
      throw new RuntimeTransitionError(
        "SESSION_HAS_NO_SCENES",
        "A sessão não possui uma cena que possa ser executada.",
      );
    }

    this.sessionId = session.id;
    this.#sceneRuntime = new SceneRuntime(firstScene.scene);
  }

  get activeSceneRuntime() {
    return this.#sceneRuntime;
  }

  get snapshot(): SessionRuntimeSnapshot {
    const currentScene = this.#scenes[this.#currentSceneIndex];
    if (!currentScene) {
      throw new RuntimeTransitionError(
        "ACTIVE_SCENE_NOT_FOUND",
        "A cena ativa da sessão não está disponível.",
      );
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
      (runtimeScene) => runtimeScene.scene.id === sceneId,
    );
    if (nextIndex < 0) {
      throw new RuntimeTransitionError(
        "SCENE_NOT_IN_SESSION",
        "A cena selecionada não pertence à sessão em execução.",
      );
    }
    if (nextIndex === this.#currentSceneIndex) return;

    this.#sceneRuntime.dispose();
    this.#currentSceneIndex = nextIndex;
    this.#sceneRuntime = new SceneRuntime(this.#scenes[nextIndex]!.scene);
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

  #ensureActive() {
    if (this.#disposed) {
      throw new RuntimeTransitionError(
        "SESSION_RUNTIME_DISPOSED",
        "A execução desta sessão já foi encerrada.",
      );
    }
  }
}
