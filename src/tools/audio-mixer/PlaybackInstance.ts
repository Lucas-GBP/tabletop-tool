import type { AudioObjectDto } from "@/api";
import { RuntimeError } from "@/runtime";
import {
  decibelsToGain,
  microsecondsToSeconds,
  secondsToMicroseconds,
} from "./audioMath";
import { browserTimer } from "./types";
import type {
  PlaybackId,
  PlaybackInfo,
  PlaybackState,
  TimerDriver,
} from "./types";

interface PlaybackInstanceOptions {
  id: PlaybackId;
  context: AudioContext;
  output: AudioNode;
  buffer: AudioBuffer;
  definition: AudioObjectDto;
  onFinished: (id: PlaybackId) => void;
  timer?: TimerDriver;
}

type ResumeIntent = "playing" | "finishing";

export class PlaybackInstance {
  readonly id: PlaybackId;
  readonly definition: AudioObjectDto;
  readonly #context: AudioContext;
  readonly #buffer: AudioBuffer;
  readonly #gain: GainNode;
  readonly #onFinished: (id: PlaybackId) => void;
  readonly #timer: TimerDriver;
  readonly #sources = new Set<AudioBufferSourceNode>();
  readonly #timers = new Set<number>();
  #state: PlaybackState = "playing";
  #resumeIntent: ResumeIntent = "playing";
  #anchorPositionSeconds: number;
  #anchorContextTime: number;
  #pausedPositionSeconds: number | null = null;
  #disposed = false;

  constructor({
    id,
    context,
    output,
    buffer,
    definition,
    onFinished,
    timer = browserTimer,
  }: PlaybackInstanceOptions) {
    this.id = id;
    this.definition = definition;
    this.#context = context;
    this.#buffer = buffer;
    this.#onFinished = onFinished;
    this.#timer = timer;
    this.#gain = context.createGain();
    this.#gain.connect(output);
    this.#anchorPositionSeconds = microsecondsToSeconds(definition.startTimeUs);
    this.#anchorContextTime = context.currentTime;
  }

  get state() {
    return this.#state;
  }

  get info(): PlaybackInfo {
    return {
      id: this.id,
      audioObjectId: this.definition.id,
      name: this.definition.name,
      state: this.#state,
      positionUs: secondsToMicroseconds(this.currentPositionSeconds),
    };
  }

  get currentPositionSeconds() {
    if (this.#pausedPositionSeconds !== null) {
      return this.#pausedPositionSeconds;
    }
    return this.#positionAt(this.#context.currentTime);
  }

  start() {
    this.#ensureActive("start_playback");
    this.#state = "playing";
    this.#resumeIntent = "playing";
    this.#beginFrom(
      microsecondsToSeconds(this.definition.startTimeUs),
      "playing",
    );
  }

  pause() {
    this.#ensureActive("pause_playback");
    if (this.#state === "paused" || this.#state === "pausing") return;
    if (this.#state !== "playing" && this.#state !== "finishing") return;
    this.#resumeIntent = this.#state === "finishing" ? "finishing" : "playing";
    this.#state = "pausing";
    const fadeSeconds = microsecondsToSeconds(
      this.definition.fadeOutDurationUs,
    );
    const finishAt = this.#context.currentTime + fadeSeconds;
    this.#fadeToZero(finishAt);
    this.#schedule(fadeSeconds, () => {
      if (this.#disposed || this.#state !== "pausing") return;
      this.#pausedPositionSeconds = this.#positionAt(finishAt);
      this.#stopSources();
      this.#state = "paused";
    });
  }

  resume() {
    this.#ensureActive("resume_playback");
    if (this.#state !== "paused" || this.#pausedPositionSeconds === null)
      return;
    const position = this.#pausedPositionSeconds;
    this.#pausedPositionSeconds = null;
    this.#state = this.#resumeIntent;
    this.#beginFrom(position, this.#resumeIntent);
  }

  seek(positionUs: number) {
    this.#ensureActive("seek_playback");
    if (this.#state === "pausing" || this.#state === "stopping") return;

    const position = this.#clampSeekPosition(microsecondsToSeconds(positionUs));
    if (this.#state === "paused") {
      this.#pausedPositionSeconds = position;
      this.#anchorPositionSeconds = position;
      this.#anchorContextTime = this.#context.currentTime;
      return;
    }

    const intent = this.#state === "finishing" ? "finishing" : "playing";
    this.#state = intent;
    this.#resumeIntent = intent;
    this.#beginFrom(position, intent);
  }

  stop() {
    this.#ensureActive("stop_playback");
    if (this.#state === "paused") {
      this.#finishNow();
      return;
    }
    if (this.#state === "stopping") return;
    this.#state = "stopping";
    const fadeSeconds = microsecondsToSeconds(
      this.definition.fadeOutDurationUs,
    );
    this.#fadeToZero(this.#context.currentTime + fadeSeconds);
    this.#schedule(fadeSeconds, () => this.#finishNow());
  }

  finish() {
    this.#ensureActive("finish_playback");
    if (this.#state === "paused") {
      this.#finishNow();
      return;
    }
    if (this.#state === "finishing") return;
    this.#state = "finishing";
    this.#resumeIntent = "finishing";
    if (!this.#hasLoop()) return;

    const loopEnd = microsecondsToSeconds(this.definition.endLoopTimeUs!);
    const position = this.currentPositionSeconds;
    const secondsToLoopEnd = Math.max(0, loopEnd - position);
    const outroAt = this.#context.currentTime + secondsToLoopEnd;
    this.#clearTimers();
    for (const source of this.#sources) {
      try {
        source.stop(outroAt);
      } catch {
        // A source that already ended does not need additional cleanup.
      }
    }
    this.#anchorPositionSeconds = loopEnd;
    this.#anchorContextTime = outroAt;
    this.#startTerminalSource(loopEnd, outroAt);
  }

  dispose() {
    if (this.#disposed) return;
    this.#finishNow();
  }

  #beginFrom(position: number, intent: ResumeIntent) {
    this.#stopSources();
    this.#clearTimers();
    this.#anchorPositionSeconds = position;
    this.#anchorContextTime = this.#context.currentTime;
    const targetGain = decibelsToGain(this.definition.volumeDb);
    const fadeSeconds = microsecondsToSeconds(this.definition.fadeInDurationUs);
    this.#gain.gain.cancelScheduledValues(this.#context.currentTime);
    this.#gain.gain.setValueAtTime(0, this.#context.currentTime);
    this.#gain.gain.linearRampToValueAtTime(
      targetGain,
      this.#context.currentTime + fadeSeconds,
    );

    if (intent === "finishing" || !this.#hasLoop()) {
      this.#startTerminalSource(position, this.#context.currentTime);
      return;
    }
    if ((this.definition.loopCrossfadeDurationUs ?? 0) > 0) {
      this.#startCrossfadeLoop(position);
    } else {
      this.#startNativeLoop(position);
    }
  }

  #startNativeLoop(position: number) {
    const source = this.#createSource(this.#gain);
    source.loop = true;
    source.loopStart = microsecondsToSeconds(this.definition.startLoopTimeUs!);
    source.loopEnd = microsecondsToSeconds(this.definition.endLoopTimeUs!);
    source.start(this.#context.currentTime, position);
  }

  #startCrossfadeLoop(position: number) {
    const loopStart = microsecondsToSeconds(this.definition.startLoopTimeUs!);
    const loopEnd = microsecondsToSeconds(this.definition.endLoopTimeUs!);
    const crossfade = microsecondsToSeconds(
      this.definition.loopCrossfadeDurationUs!,
    );
    const firstDuration = Math.max(0.001, loopEnd - position);
    this.#createCrossfadeSource(
      position,
      this.#context.currentTime,
      firstDuration,
      crossfade,
      false,
    );
    const nextAt = this.#context.currentTime + firstDuration - crossfade;
    this.#scheduleCrossfadeIteration(nextAt, loopStart, loopEnd, crossfade);
  }

  #scheduleCrossfadeIteration(
    startAt: number,
    loopStart: number,
    loopEnd: number,
    crossfade: number,
  ) {
    const delay = Math.max(0, startAt - this.#context.currentTime - 0.05);
    this.#schedule(delay, () => {
      if (this.#state !== "playing" || this.#disposed) return;
      const duration = loopEnd - loopStart;
      this.#createCrossfadeSource(
        loopStart,
        startAt,
        duration,
        crossfade,
        true,
      );
      this.#scheduleCrossfadeIteration(
        startAt + duration - crossfade,
        loopStart,
        loopEnd,
        crossfade,
      );
    });
  }

  #createCrossfadeSource(
    offset: number,
    startAt: number,
    duration: number,
    crossfade: number,
    fadeIn: boolean,
  ) {
    const sourceGain = this.#context.createGain();
    sourceGain.connect(this.#gain);
    if (fadeIn) {
      sourceGain.gain.setValueAtTime(0, startAt);
      sourceGain.gain.linearRampToValueAtTime(1, startAt + crossfade);
    } else {
      sourceGain.gain.setValueAtTime(1, startAt);
    }
    sourceGain.gain.setValueAtTime(1, startAt + duration - crossfade);
    sourceGain.gain.linearRampToValueAtTime(0, startAt + duration);
    const source = this.#createSource(sourceGain);
    source.start(startAt, offset, duration);
  }

  #startTerminalSource(position: number, startAt: number) {
    const end = microsecondsToSeconds(this.definition.endTimeUs);
    const duration = Math.max(0, end - position);
    if (duration <= 0) {
      const delay = Math.max(0, startAt - this.#context.currentTime);
      this.#schedule(delay, () => this.#finishNow());
      return;
    }
    const fadeSeconds = Math.min(
      duration,
      microsecondsToSeconds(this.definition.fadeOutDurationUs),
    );
    const targetGain = decibelsToGain(this.definition.volumeDb);
    this.#gain.gain.setValueAtTime(
      this.#gain.gain.value || targetGain,
      Math.max(this.#context.currentTime, startAt + duration - fadeSeconds),
    );
    this.#gain.gain.linearRampToValueAtTime(0, startAt + duration);
    const source = this.#createSource(this.#gain, true);
    source.start(startAt, position, duration);
  }

  #createSource(output: AudioNode, terminal = false) {
    const source = this.#context.createBufferSource();
    source.buffer = this.#buffer;
    source.connect(output);
    this.#sources.add(source);
    source.onended = () => {
      this.#sources.delete(source);
      source.disconnect();
      if (terminal && !this.#disposed && this.#state !== "pausing") {
        this.#finishNow();
      }
    };
    return source;
  }

  #positionAt(contextTime: number) {
    const start = microsecondsToSeconds(this.definition.startTimeUs);
    const end = microsecondsToSeconds(this.definition.endTimeUs);
    const raw =
      this.#anchorPositionSeconds + (contextTime - this.#anchorContextTime);
    if (this.#resumeIntent === "playing" && this.#hasLoop()) {
      const loopStart = microsecondsToSeconds(this.definition.startLoopTimeUs!);
      const loopEnd = microsecondsToSeconds(this.definition.endLoopTimeUs!);
      if (raw >= loopStart) {
        return loopStart + ((raw - loopStart) % (loopEnd - loopStart));
      }
    }
    return Math.min(end, Math.max(start, raw));
  }

  #hasLoop() {
    return (
      this.definition.startLoopTimeUs !== null &&
      this.definition.endLoopTimeUs !== null
    );
  }

  #clampSeekPosition(position: number) {
    const start = microsecondsToSeconds(this.definition.startTimeUs);
    const configuredEnd =
      this.#resumeIntent === "playing" && this.#hasLoop()
        ? microsecondsToSeconds(this.definition.endLoopTimeUs!)
        : microsecondsToSeconds(this.definition.endTimeUs);
    const end = Math.max(start, configuredEnd - 0.000001);
    return Math.min(end, Math.max(start, position));
  }

  #fadeToZero(finishAt: number) {
    const now = this.#context.currentTime;
    this.#gain.gain.cancelScheduledValues(now);
    this.#gain.gain.setValueAtTime(this.#gain.gain.value, now);
    this.#gain.gain.linearRampToValueAtTime(0, finishAt);
  }

  #schedule(delaySeconds: number, callback: () => void) {
    const timerId = this.#timer.set(
      () => {
        this.#timers.delete(timerId);
        callback();
      },
      Math.max(1, delaySeconds * 1000),
    );
    this.#timers.add(timerId);
  }

  #clearTimers() {
    for (const timerId of this.#timers) this.#timer.clear(timerId);
    this.#timers.clear();
  }

  #stopSources() {
    for (const source of this.#sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Stopping is idempotent at the runtime boundary.
      }
      source.disconnect();
    }
    this.#sources.clear();
  }

  #finishNow() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#state = "finished";
    this.#clearTimers();
    this.#stopSources();
    this.#gain.disconnect();
    this.#onFinished(this.id);
  }

  #ensureActive(operation: string) {
    if (this.#disposed || this.#state === "finished") {
      throw new RuntimeError({
        code: "PLAYBACK_NOT_FOUND",
        message: "A reprodução selecionada já foi encerrada.",
        operation,
        entityId: this.id,
        recoverable: true,
      });
    }
  }
}
