import { RuntimeError, normalizeRuntimeError } from "@/runtime";
import { AudioCompositionInstance } from "./AudioCompositionInstance";
import { AudioMixer } from "./AudioMixer";
import type {
  AudioCueReference,
  SceneAudioRuntimeDefinition,
  SceneAudioRuntimeSnapshot,
} from "./types";
import type {
  AudioCompositionId,
  CompositionLayerId,
  PlaybackId,
  SceneId,
  SceneLevelId,
} from "@/types";

interface SceneAudioRuntimeOptions {
  definition: SceneAudioRuntimeDefinition;
  mixer: AudioMixer;
  onError: (error: RuntimeError) => void;
}

export class SceneAudioRuntime {
  readonly sceneId: SceneId;
  readonly #definition: SceneAudioRuntimeDefinition;
  readonly #mixer: AudioMixer;
  readonly #onError: (error: RuntimeError) => void;
  readonly #compositions = new Map<
    AudioCompositionId,
    AudioCompositionInstance
  >();
  readonly #overrides = new Map<CompositionLayerId, boolean>();
  readonly #directPlaybackIds = new Set<PlaybackId>();
  #currentLevelId: SceneLevelId;
  #started = false;
  #disposed = false;

  constructor({ definition, mixer, onError }: SceneAudioRuntimeOptions) {
    const initialLevel = definition.levels[0];
    if (!initialLevel) {
      throw new RuntimeError({
        code: "AUDIO_LEVEL_CONFIGURATION_NOT_FOUND",
        message: "A configuração de nível de áudio não está disponível.",
        operation: "start_scene_audio",
        entityId: definition.scene.sceneId,
        recoverable: false,
      });
    }
    this.sceneId = definition.scene.sceneId;
    this.#currentLevelId = initialLevel.sceneLevelId;
    this.#definition = definition;
    this.#mixer = mixer;
    this.#onError = onError;
    for (const compositionId of definition.scene.audioCompositionIds) {
      const composition = definition.definitions.compositions.find(
        (candidate) => candidate.id === compositionId,
      );
      if (!composition) {
        onError(
          new RuntimeError({
            code: "AUDIO_COMPOSITION_NOT_FOUND",
            message:
              "Uma composição configurada para a cena não está disponível.",
            operation: "start_scene_audio",
            entityId: compositionId,
            recoverable: true,
          }),
        );
        continue;
      }
      this.#compositions.set(
        composition.id,
        new AudioCompositionInstance({
          definition: composition,
          mixer,
          onError,
        }),
      );
    }
  }

  get snapshot(): SceneAudioRuntimeSnapshot {
    const levelDisabled = this.#disabledLayersFor(this.#currentLevelId);
    const cues: AudioCueReference[] = [
      ...this.#definition.scene.audioObjectIds.map((id) => ({
        kind: "audioObject" as const,
        id,
      })),
      ...this.#definition.scene.audioListIds.map((id) => ({
        kind: "audioList" as const,
        id,
      })),
    ];
    return {
      sceneId: this.sceneId,
      currentLevelId: this.#currentLevelId,
      started: this.#started,
      disposed: this.#disposed,
      cues,
      compositions: [...this.#compositions.values()].map((instance) => ({
        id: instance.definition.id,
        name: instance.definition.name,
        layers: instance.definition.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          enabled: this.#effectiveState(layer.id, levelDisabled),
          persistentEnabled: !levelDisabled.has(layer.id),
          runtimeOverride: this.#overrides.get(layer.id) ?? null,
        })),
      })),
    };
  }

  start(levelId: SceneLevelId) {
    this.#ensureActive("start_scene_audio");
    this.#ensureLevel(levelId);
    this.#currentLevelId = levelId;
    this.#started = true;
    this.#reconcile();
  }

  switchLevel(levelId: SceneLevelId) {
    this.#ensureActive("switch_scene_audio_level");
    this.#ensureLevel(levelId);
    this.#currentLevelId = levelId;
    if (this.#started) this.#reconcile();
  }

  setLayerOverride(layerId: CompositionLayerId, enabled: boolean | null) {
    this.#ensureActive("set_audio_layer_override");
    this.#compositionForLayer(layerId);
    if (enabled === null) this.#overrides.delete(layerId);
    else this.#overrides.set(layerId, enabled);
    if (this.#started) this.#reconcile();
  }

  async playCue(cue: AudioCueReference) {
    this.#ensureActive("play_scene_audio_cue");
    if (!this.#cueIsAvailable(cue)) {
      throw new RuntimeError({
        code: "AUDIO_CUE_NOT_IN_SCENE",
        message: "Este áudio não está disponível na cena atual.",
        operation: "play_scene_audio_cue",
        entityId: cue.id,
        recoverable: true,
      });
    }
    try {
      const id = await this.#mixer.play(cue);
      if (this.#disposed) {
        if (this.#mixer.hasPlayback(id)) this.#mixer.stop(id);
        return id;
      }
      this.#directPlaybackIds.add(id);
      this.#pruneDirectPlaybacks();
      return id;
    } catch (cause) {
      const error = normalizeRuntimeError(cause, {
        code: "SCENE_AUDIO_CUE_FAILED",
        message: "Não foi possível tocar o áudio desta cena.",
        operation: "play_scene_audio_cue",
        entityId: cue.id,
        recoverable: true,
      });
      this.#onError(error);
      throw error;
    }
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const composition of this.#compositions.values())
      composition.dispose();
    this.#pruneDirectPlaybacks();
    for (const id of this.#directPlaybackIds) {
      if (this.#mixer.hasPlayback(id)) this.#mixer.stop(id);
    }
    this.#directPlaybackIds.clear();
    this.#overrides.clear();
    this.#mixer.resetListCursors(this.#usedListIds());
  }

  #reconcile() {
    const disabled = this.#disabledLayersFor(this.#currentLevelId);
    for (const composition of this.#compositions.values()) {
      for (const layer of composition.definition.layers) {
        try {
          composition.setEnabled(
            layer.id,
            this.#effectiveState(layer.id, disabled),
          );
        } catch (cause) {
          this.#onError(
            normalizeRuntimeError(cause, {
              code: "SCENE_AUDIO_RECONCILE_FAILED",
              message: `A camada ${layer.name} não pôde ser reconciliada.`,
              operation: "reconcile_scene_audio",
              entityId: layer.id,
              recoverable: true,
            }),
          );
        }
      }
    }
  }

  #disabledLayersFor(levelId: SceneLevelId) {
    const configuration = this.#definition.levels.find(
      (level) => level.sceneLevelId === levelId,
    );
    return new Set(configuration?.disabledLayerIds ?? []);
  }

  #effectiveState(
    layerId: CompositionLayerId,
    persistentDisabled: ReadonlySet<CompositionLayerId>,
  ) {
    return this.#overrides.get(layerId) ?? !persistentDisabled.has(layerId);
  }

  #compositionForLayer(layerId: CompositionLayerId) {
    const composition = [...this.#compositions.values()].find((candidate) =>
      candidate.definition.layers.some((layer) => layer.id === layerId),
    );
    if (!composition) {
      throw new RuntimeError({
        code: "COMPOSITION_LAYER_NOT_FOUND",
        message: "A camada selecionada não pertence à cena atual.",
        operation: "configure_scene_audio_layer",
        entityId: layerId,
        recoverable: true,
      });
    }
    return composition;
  }

  #cueIsAvailable(cue: AudioCueReference) {
    return cue.kind === "audioObject"
      ? this.#definition.scene.audioObjectIds.includes(cue.id)
      : this.#definition.scene.audioListIds.includes(cue.id);
  }

  #usedListIds() {
    const ids = new Set(this.#definition.scene.audioListIds);
    for (const composition of this.#compositions.values()) {
      for (const layer of composition.definition.layers) {
        if (layer.source.kind === "audioList")
          ids.add(layer.source.audioListId);
      }
    }
    return ids;
  }

  #pruneDirectPlaybacks() {
    for (const id of this.#directPlaybackIds) {
      if (!this.#mixer.hasPlayback(id)) this.#directPlaybackIds.delete(id);
    }
  }

  #ensureActive(operation: string) {
    if (this.#disposed) {
      throw new RuntimeError({
        code: "SCENE_AUDIO_RUNTIME_DISPOSED",
        message: "O áudio desta cena já foi encerrado.",
        operation,
        entityId: this.sceneId,
        recoverable: false,
      });
    }
  }

  #ensureLevel(levelId: SceneLevelId) {
    if (
      this.#definition.levels.some((level) => level.sceneLevelId === levelId)
    ) {
      return;
    }
    throw new RuntimeError({
      code: "AUDIO_LEVEL_CONFIGURATION_NOT_FOUND",
      message: "A configuração de áudio deste nível não está disponível.",
      operation: "switch_scene_audio_level",
      entityId: levelId,
      recoverable: true,
    });
  }
}
