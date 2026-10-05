import type { AudioCompositionDto, CompositionLayerDto } from "@/api";
import { RuntimeError, normalizeRuntimeError } from "@/runtime";
import { AudioMixer } from "./AudioMixer";
import { browserTimer } from "./types";
import type { AudioCueReference, TimerDriver } from "./types";
import type { CompositionLayerId, PlaybackId } from "@/types";

interface AudioCompositionInstanceOptions {
  definition: AudioCompositionDto;
  mixer: AudioMixer;
  onError: (error: RuntimeError) => void;
  random?: () => number;
  timer?: TimerDriver;
}

interface LayerState {
  enabled: boolean;
  generation: number;
  timerId: number | null;
  playbackIds: Set<PlaybackId>;
}

export class AudioCompositionInstance {
  readonly definition: AudioCompositionDto;
  readonly #mixer: AudioMixer;
  readonly #onError: (error: RuntimeError) => void;
  readonly #random: () => number;
  readonly #timer: TimerDriver;
  readonly #layers = new Map<CompositionLayerId, LayerState>();
  #disposed = false;

  constructor({
    definition,
    mixer,
    onError,
    random = Math.random,
    timer = browserTimer,
  }: AudioCompositionInstanceOptions) {
    this.definition = definition;
    this.#mixer = mixer;
    this.#onError = onError;
    this.#random = random;
    this.#timer = timer;
    for (const layer of definition.layers) {
      this.#layers.set(layer.id, {
        enabled: false,
        generation: 0,
        timerId: null,
        playbackIds: new Set(),
      });
    }
  }

  isEnabled(layerId: CompositionLayerId) {
    return this.#state(layerId).enabled;
  }

  setEnabled(layerId: CompositionLayerId, enabled: boolean) {
    this.#ensureActive();
    const layer = this.#layer(layerId);
    const state = this.#state(layerId);
    if (state.enabled === enabled) return;
    state.enabled = enabled;
    state.generation += 1;
    if (enabled) {
      if (layer.execution.kind === "continuous") {
        void this.#execute(layer, state.generation);
      } else {
        this.#schedule(layer, state.generation);
      }
    } else {
      this.#disable(layer, state);
    }
  }

  dispose() {
    if (this.#disposed) return;
    for (const state of this.#layers.values()) {
      state.enabled = false;
      state.generation += 1;
      if (state.timerId !== null) this.#timer.clear(state.timerId);
      state.timerId = null;
      this.#prune(state);
      for (const playbackId of state.playbackIds) {
        if (this.#mixer.hasPlayback(playbackId)) this.#mixer.stop(playbackId);
      }
      state.playbackIds.clear();
    }
    this.#disposed = true;
  }

  #schedule(layer: CompositionLayerDto, generation: number) {
    const state = this.#state(layer.id);
    if (layer.execution.kind !== "randomInterval") return;
    const minimum = layer.execution.minIntervalUs;
    const maximum = layer.execution.maxIntervalUs;
    const sampled = minimum + this.#boundedRandom() * (maximum - minimum);
    const delayMs = Math.max(1, sampled / 1000);
    state.timerId = this.#timer.set(() => {
      state.timerId = null;
      if (!state.enabled || state.generation !== generation || this.#disposed)
        return;
      this.#schedule(layer, generation);
      void this.#execute(layer, generation);
    }, delayMs);
  }

  async #execute(layer: CompositionLayerDto, generation: number) {
    const state = this.#state(layer.id);
    try {
      const playbackId = await this.#mixer.play(sourceCue(layer));
      if (!state.enabled || state.generation !== generation || this.#disposed) {
        if (this.#mixer.hasPlayback(playbackId)) this.#mixer.stop(playbackId);
        return;
      }
      state.playbackIds.add(playbackId);
      this.#prune(state);
    } catch (cause) {
      this.#onError(
        normalizeRuntimeError(cause, {
          code: "COMPOSITION_LAYER_FAILED",
          message: `A camada ${layer.name} não pôde ser executada.`,
          operation: "execute_composition_layer",
          entityId: layer.id,
          recoverable: true,
        }),
      );
    }
  }

  #disable(layer: CompositionLayerDto, state: LayerState) {
    if (state.timerId !== null) {
      this.#timer.clear(state.timerId);
      state.timerId = null;
    }
    this.#prune(state);
    for (const playbackId of state.playbackIds) {
      if (!this.#mixer.hasPlayback(playbackId)) continue;
      try {
        if (layer.disableBehavior === "stop") this.#mixer.stop(playbackId);
        else this.#mixer.finish(playbackId);
      } catch (cause) {
        this.#onError(
          normalizeRuntimeError(cause, {
            code: "COMPOSITION_LAYER_DISABLE_FAILED",
            message: `A camada ${layer.name} não pôde ser encerrada.`,
            operation: "disable_composition_layer",
            entityId: layer.id,
            recoverable: true,
          }),
        );
      }
    }
    state.playbackIds.clear();
  }

  #prune(state: LayerState) {
    for (const id of state.playbackIds) {
      if (!this.#mixer.hasPlayback(id)) state.playbackIds.delete(id);
    }
  }

  #layer(id: CompositionLayerId) {
    const layer = this.definition.layers.find(
      (candidate) => candidate.id === id,
    );
    if (!layer) {
      throw new RuntimeError({
        code: "COMPOSITION_LAYER_NOT_FOUND",
        message: "A camada selecionada não existe nesta composição.",
        operation: "configure_composition_layer",
        entityId: id,
        recoverable: true,
      });
    }
    return layer;
  }

  #state(id: CompositionLayerId) {
    const state = this.#layers.get(id);
    if (!state) {
      throw new RuntimeError({
        code: "COMPOSITION_LAYER_NOT_FOUND",
        message: "A camada selecionada não existe nesta composição.",
        operation: "read_composition_layer",
        entityId: id,
        recoverable: true,
      });
    }
    return state;
  }

  #boundedRandom() {
    return Math.min(1, Math.max(0, this.#random()));
  }

  #ensureActive() {
    if (this.#disposed) {
      throw new RuntimeError({
        code: "AUDIO_COMPOSITION_DISPOSED",
        message: "A composição de áudio já foi encerrada.",
        operation: "configure_composition",
        entityId: this.definition.id,
        recoverable: false,
      });
    }
  }
}

function sourceCue(layer: CompositionLayerDto): AudioCueReference {
  return layer.source.kind === "audioObject"
    ? { kind: "audioObject", id: layer.source.audioObjectId }
    : { kind: "audioList", id: layer.source.audioListId };
}
