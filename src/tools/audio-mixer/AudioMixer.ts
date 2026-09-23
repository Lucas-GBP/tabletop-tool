import type {
  AudioDefinitions,
  AudioCueReference,
  PlaybackInfo,
} from "./types";
import { RuntimeError, normalizeRuntimeError } from "@/runtime";
import { decibelsToGain } from "./audioMath";
import {
  audioBufferDurationUs,
  fitAudioObjectToDuration,
} from "./audioObjectTiming";
import { AudioBufferLoader } from "./AudioBufferLoader";
import { AudioListSelector } from "./AudioListSelector";
import { PlaybackInstance } from "./PlaybackInstance";

interface AudioMixerOptions {
  definitions: AudioDefinitions;
  masterVolumeDb: number;
  resolveFilePath: (assetPath: string) => Promise<string>;
  contextFactory?: () => AudioContext;
  random?: () => number;
  loaderFactory?: (context: AudioContext) => AudioBufferLoader;
}

export class AudioMixer {
  readonly #definitions: AudioDefinitions;
  readonly #resolveFilePath: (assetPath: string) => Promise<string>;
  readonly #contextFactory: () => AudioContext;
  readonly #selector: AudioListSelector;
  readonly #loaderFactory:
    ((context: AudioContext) => AudioBufferLoader) | undefined;
  readonly #playbacks = new Map<string, PlaybackInstance>();
  #context: AudioContext | null = null;
  #masterGain: GainNode | null = null;
  #loader: AudioBufferLoader | null = null;
  #masterVolumeDb: number;
  #disposed = false;

  constructor({
    definitions,
    masterVolumeDb,
    resolveFilePath,
    contextFactory = defaultContextFactory,
    random,
    loaderFactory,
  }: AudioMixerOptions) {
    this.#definitions = definitions;
    this.#masterVolumeDb = masterVolumeDb;
    this.#resolveFilePath = resolveFilePath;
    this.#contextFactory = contextFactory;
    this.#selector = new AudioListSelector(random);
    this.#loaderFactory = loaderFactory;
  }

  get activated() {
    return this.#context !== null;
  }

  get activePlaybacks(): readonly PlaybackInfo[] {
    return [...this.#playbacks.values()].map((playback) => playback.info);
  }

  hasPlayback(id: string) {
    return this.#playbacks.has(id);
  }

  async activate() {
    this.#ensureActive("activate_audio");
    const context = this.#getContext();
    if (context.state === "suspended") await context.resume();
  }

  async play(cue: AudioCueReference) {
    this.#ensureActive("play_audio_cue");
    try {
      await this.activate();
      const object = this.#resolveCue(cue);
      const file = this.#definitions.files.find(
        (candidate) => candidate.relativePath === object.assetPath,
      );
      if (!file) {
        throw new RuntimeError({
          code: "AUDIO_FILE_NOT_FOUND",
          message: "O arquivo usado por este áudio não está disponível.",
          operation: "play_audio_cue",
          entityId: object.assetPath,
          recoverable: true,
        });
      }
      const buffer = await this.#loader!.load(file);
      const id = crypto.randomUUID();
      const playback = new PlaybackInstance({
        id,
        context: this.#context!,
        output: this.#masterGain!,
        buffer,
        definition: fitAudioObjectToDuration(
          object,
          audioBufferDurationUs(buffer),
        ),
        onFinished: (finishedId) => {
          this.#playbacks.delete(finishedId);
        },
      });
      this.#playbacks.set(id, playback);
      playback.start();
      return id;
    } catch (cause) {
      throw normalizeRuntimeError(cause, {
        code: "PLAYBACK_FAILED",
        message: "Não foi possível iniciar a reprodução.",
        operation: "play_audio_cue",
        entityId: cue.id,
        recoverable: true,
      });
    }
  }

  pause(id: string) {
    this.#playback(id, "pause_playback").pause();
  }

  resume(id: string) {
    this.#playback(id, "resume_playback").resume();
  }

  seek(id: string, positionUs: number) {
    this.#playback(id, "seek_playback").seek(positionUs);
  }

  stop(id: string) {
    this.#playback(id, "stop_playback").stop();
  }

  finish(id: string) {
    this.#playback(id, "finish_playback").finish();
  }

  pauseAll() {
    for (const playback of this.#playbacks.values()) playback.pause();
  }

  resumeAll() {
    for (const playback of this.#playbacks.values()) playback.resume();
  }

  stopAll() {
    for (const playback of [...this.#playbacks.values()]) playback.stop();
  }

  setMasterVolumeDb(value: number) {
    if (!Number.isFinite(value)) {
      throw new RuntimeError({
        code: "AUDIO_INVALID_VOLUME",
        message: "O volume geral não é válido.",
        operation: "set_master_volume",
        recoverable: true,
      });
    }
    this.#masterVolumeDb = value;
    if (this.#masterGain && this.#context) {
      this.#masterGain.gain.setValueAtTime(
        decibelsToGain(value),
        this.#context.currentTime,
      );
    }
  }

  resetListCursors(listIds?: Iterable<string>) {
    this.#selector.reset(listIds);
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const playback of [...this.#playbacks.values()]) playback.dispose();
    this.#playbacks.clear();
    this.#loader?.clear();
    this.#masterGain?.disconnect();
    if (this.#context) void this.#context.close();
  }

  #resolveCue(cue: AudioCueReference) {
    if (cue.kind === "audioObject") {
      const object = this.#definitions.objects.find(
        (candidate) => candidate.id === cue.id,
      );
      if (object) return object;
    } else {
      const list = this.#definitions.lists.find(
        (candidate) => candidate.id === cue.id,
      );
      if (list) {
        const objectId = this.#selector.select(list);
        const object = this.#definitions.objects.find(
          (candidate) => candidate.id === objectId,
        );
        if (object) return object;
      }
    }
    throw new RuntimeError({
      code: "AUDIO_CUE_NOT_FOUND",
      message: "O áudio selecionado não está disponível.",
      operation: "resolve_audio_cue",
      entityId: cue.id,
      recoverable: true,
    });
  }

  #playback(id: string, operation: string) {
    this.#ensureActive(operation);
    const playback = this.#playbacks.get(id);
    if (!playback) {
      throw new RuntimeError({
        code: "PLAYBACK_NOT_FOUND",
        message: "A reprodução selecionada já foi encerrada.",
        operation,
        entityId: id,
        recoverable: true,
      });
    }
    return playback;
  }

  #getContext() {
    if (this.#context) return this.#context;
    try {
      this.#context = this.#contextFactory();
      this.#masterGain = this.#context.createGain();
      this.#masterGain.gain.value = decibelsToGain(this.#masterVolumeDb);
      this.#masterGain.connect(this.#context.destination);
      this.#loader = this.#loaderFactory
        ? this.#loaderFactory(this.#context)
        : new AudioBufferLoader({
            context: this.#context,
            resolvePath: this.#resolveFilePath,
          });
      return this.#context;
    } catch (cause) {
      throw normalizeRuntimeError(cause, {
        code: "AUDIO_CONTEXT_UNAVAILABLE",
        message: "O sistema de áudio não está disponível.",
        operation: "create_audio_context",
        recoverable: false,
      });
    }
  }

  #ensureActive(operation: string) {
    if (this.#disposed) {
      throw new RuntimeError({
        code: "AUDIO_MIXER_DISPOSED",
        message: "O sistema de áudio já foi encerrado.",
        operation,
        recoverable: false,
      });
    }
  }
}

function defaultContextFactory() {
  if (typeof AudioContext === "undefined") {
    throw new Error("AudioContext is unavailable.");
  }
  return new AudioContext();
}
