import { describe, expect, it, vi } from "vitest";
import type { AudioObjectDto } from "@/api";
import { PlaybackInstance } from "./PlaybackInstance";
import type { TimerDriver } from "./types";

class FakeTimer implements TimerDriver {
  readonly callbacks = new Map<number, () => void>();
  #nextId = 0;

  set(callback: () => void) {
    this.#nextId += 1;
    this.callbacks.set(this.#nextId, callback);
    return this.#nextId;
  }

  clear(id: number) {
    this.callbacks.delete(id);
  }

  runAll() {
    for (const [id, callback] of [...this.callbacks]) {
      this.callbacks.delete(id);
      callback();
    }
  }
}

function createFixture(definition: AudioObjectDto = audioObject()) {
  const sources: Array<
    AudioBufferSourceNode & { stop: ReturnType<typeof vi.fn> }
  > = [];
  const sourceStops: Array<ReturnType<typeof vi.fn>> = [];
  const gainRamp = vi.fn();
  const gainParam = {
    value: 1,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: gainRamp,
  } as unknown as AudioParam;
  const gain = {
    gain: gainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as GainNode;
  const contextShape = {
    currentTime: 0,
    createGain: () => gain,
    createBufferSource: () => {
      const stop = vi.fn();
      const source = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop,
      } as unknown as AudioBufferSourceNode & {
        stop: ReturnType<typeof vi.fn>;
      };
      sources.push(source);
      sourceStops.push(stop);
      return source;
    },
  };
  const timer = new FakeTimer();
  const onFinished = vi.fn();
  const playback = new PlaybackInstance({
    id: "playback-1",
    context: contextShape as unknown as AudioContext,
    output: { connect: vi.fn() } as unknown as AudioNode,
    buffer: { duration: 10 } as AudioBuffer,
    definition,
    onFinished,
    timer,
  });
  return {
    playback,
    contextShape,
    timer,
    sources,
    sourceStops,
    onFinished,
    gainRamp,
  };
}

describe("PlaybackInstance", () => {
  it("pauses, seeks and resumes from the retained position", () => {
    const { playback, contextShape, timer } = createFixture();
    playback.start();
    contextShape.currentTime = 2;

    playback.pause();
    expect(playback.state).toBe("pausing");
    timer.runAll();
    expect(playback.state).toBe("paused");

    playback.seek(4_000_000);
    expect(playback.info.positionUs).toBe(4_000_000);
    playback.resume();
    expect(playback.state).toBe("playing");
  });

  it("finishes once after the stop fade", () => {
    const { playback, timer, onFinished, gainRamp } = createFixture();
    playback.start();

    playback.stop();
    expect(playback.state).toBe("stopping");
    expect(gainRamp).toHaveBeenCalled();
    timer.runAll();

    expect(playback.state).toBe("finished");
    expect(onFinished).toHaveBeenCalledOnce();
    expect(() => playback.resume()).toThrowError(
      expect.objectContaining({ code: "PLAYBACK_NOT_FOUND" }),
    );
  });

  it("leaves a loop through its outro when asked to finish", () => {
    const { playback, sources, sourceStops } = createFixture(
      audioObject({ startLoopTimeUs: 2_000_000, endLoopTimeUs: 5_000_000 }),
    );
    playback.start();
    expect(sources[0]?.loop).toBe(true);

    playback.finish();

    expect(playback.state).toBe("finishing");
    expect(sourceStops[0]).toHaveBeenCalled();
    expect(sources).toHaveLength(2);
  });
});

function audioObject(overrides: Partial<AudioObjectDto> = {}): AudioObjectDto {
  return {
    id: "audio-1",
    name: "Rain",
    assetPath: "rain.wav",
    volumeDb: 0,
    startTimeUs: 0,
    endTimeUs: 10_000_000,
    startLoopTimeUs: null,
    endLoopTimeUs: null,
    fadeInDurationUs: 100_000,
    fadeOutDurationUs: 100_000,
    loopCrossfadeDurationUs: null,
    ...overrides,
  };
}
