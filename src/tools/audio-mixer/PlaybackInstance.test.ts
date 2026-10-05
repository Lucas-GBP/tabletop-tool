import { describe, expect, it, vi } from "vitest";
import type { AudioObjectDto } from "@/api";
import { testId } from "@/test/ids";
import { PlaybackInstance } from "./PlaybackInstance";
import type { TimerDriver } from "./types";

interface ScheduledCallback {
  readonly atSeconds: number;
  readonly callback: () => void;
}

class FakeTimer implements TimerDriver {
  readonly callbacks = new Map<number, ScheduledCallback>();
  #nextId = 0;

  constructor(private readonly context: { currentTime: number }) {}

  set(callback: () => void, delayMs: number) {
    this.#nextId += 1;
    this.callbacks.set(this.#nextId, {
      atSeconds: this.context.currentTime + delayMs / 1000,
      callback,
    });
    return this.#nextId;
  }

  clear(id: number) {
    this.callbacks.delete(id);
  }

  advanceTo(targetSeconds: number) {
    while (true) {
      const next = [...this.callbacks.entries()]
        .filter(([, scheduled]) => scheduled.atSeconds <= targetSeconds)
        .sort((left, right) => left[1].atSeconds - right[1].atSeconds)[0];
      if (!next) break;
      this.callbacks.delete(next[0]);
      this.context.currentTime = next[1].atSeconds;
      next[1].callback();
    }
    this.context.currentTime = targetSeconds;
  }
}

type FakeSource = Omit<
  AudioBufferSourceNode,
  "start" | "stop" | "disconnect"
> & {
  readonly start: ReturnType<
    typeof vi.fn<(when: number, offset?: number, duration?: number) => void>
  >;
  readonly stop: ReturnType<typeof vi.fn<(when?: number) => void>>;
  readonly disconnect: ReturnType<typeof vi.fn<() => void>>;
};

type FakeGain = GainNode & {
  readonly disconnect: ReturnType<typeof vi.fn>;
};

function createFixture(definition: AudioObjectDto = audioObject()) {
  const sources: FakeSource[] = [];
  const gains: FakeGain[] = [];
  const contextShape = { currentTime: 0 };
  const createGain = () => {
    const gain = {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as FakeGain;
    gains.push(gain);
    return gain;
  };
  const context = {
    createGain,
    createBufferSource: () => {
      const source = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      } as unknown as FakeSource;
      sources.push(source);
      return source;
    },
  };
  Object.defineProperty(context, "currentTime", {
    get: () => contextShape.currentTime,
    set: (value: number) => {
      contextShape.currentTime = value;
    },
  });
  const timer = new FakeTimer(contextShape);
  const onFinished = vi.fn();
  const playback = new PlaybackInstance({
    id: testId.playback("playback-1"),
    context: context as unknown as AudioContext,
    output: { connect: vi.fn() } as unknown as AudioNode,
    buffer: { duration: 10 } as AudioBuffer,
    definition,
    onFinished,
    timer,
  });
  return { playback, contextShape, timer, sources, gains, onFinished };
}

describe("PlaybackInstance", () => {
  it("uses the effective crossfade cycle for scheduling and position", () => {
    const { playback, timer, sources } = createFixture(crossfadeObject());
    playback.start();

    timer.advanceTo(14);

    expect(sources.map((source) => source.start.mock.calls[0]?.[0])).toEqual([
      0, 5, 8, 11, 14,
    ]);
    expect(playback.info.positionUs).toBe(2_000_000);
    expect(playback.resourceCounts.timers).toBe(1);
  });

  it("pauses and resumes a crossfade loop from its logical position", () => {
    const { playback, timer, sources } = createFixture(crossfadeObject());
    playback.start();
    timer.advanceTo(7);

    playback.pause();
    timer.advanceTo(7.1);

    expect(playback.state).toBe("paused");
    expect(playback.info.positionUs).toBe(4_100_000);
    expect(playback.resourceCounts).toEqual({
      sources: 0,
      sourceGains: 0,
      timers: 0,
    });

    playback.resume();
    expect(playback.state).toBe("playing");
    expect(sources.at(-1)?.start.mock.calls[0]?.[0]).toBeCloseTo(7.1);
    expect(sources.at(-1)?.start.mock.calls[0]?.[1]).toBeCloseTo(4.1);
    expect(sources.at(-1)?.start.mock.calls[0]?.[2]).toBeCloseTo(1.9);
  });

  it("leaves a crossfade loop through its outro", () => {
    const { playback, timer, sources } = createFixture(crossfadeObject());
    playback.start();
    timer.advanceTo(7);

    playback.finish();

    expect(playback.state).toBe("finishing");
    expect(sources.at(-1)?.start.mock.calls[0]).toEqual([9, 6, 4]);
    expect(playback.resourceCounts.timers).toBe(0);
  });

  it("disconnects sources and their dedicated gains after they end", () => {
    const { playback, sources, gains } = createFixture(crossfadeObject());
    playback.start();
    const source = sources[0]!;
    const sourceGain = gains[1]!;

    source.onended?.(new Event("ended"));

    expect(source.disconnect.mock.calls).toHaveLength(1);
    expect(sourceGain.disconnect.mock.calls).toHaveLength(1);
    expect(playback.resourceCounts.sources).toBe(0);
    expect(playback.resourceCounts.sourceGains).toBe(0);
  });

  it("does not retain completed nodes during a long crossfade run", () => {
    const { playback, timer, contextShape, sources } =
      createFixture(crossfadeObject());
    const ended = new Set<FakeSource>();
    playback.start();

    for (let iteration = 0; iteration < 100; iteration += 1) {
      timer.advanceTo(5 + iteration * 3);
      for (const source of sources) {
        const [startAt, , duration] = source.start.mock.calls[0] ?? [];
        if (
          !ended.has(source) &&
          typeof startAt === "number" &&
          typeof duration === "number" &&
          startAt + duration <= contextShape.currentTime
        ) {
          ended.add(source);
          source.onended?.(new Event("ended"));
        }
      }
      expect(playback.resourceCounts.sources).toBeLessThanOrEqual(2);
      expect(playback.resourceCounts.sourceGains).toBeLessThanOrEqual(2);
      expect(playback.resourceCounts.timers).toBe(1);
    }
  });

  it("releases every runtime resource when stopped", () => {
    const { playback, timer, onFinished, gains } =
      createFixture(crossfadeObject());
    playback.start();
    timer.advanceTo(20);

    playback.stop();
    timer.advanceTo(20.1);

    expect(playback.state).toBe("finished");
    expect(playback.resourceCounts).toEqual({
      sources: 0,
      sourceGains: 0,
      timers: 0,
    });
    expect(gains.every((gain) => gain.disconnect.mock.calls.length > 0)).toBe(
      true,
    );
    expect(onFinished).toHaveBeenCalledOnce();
  });
});

function crossfadeObject() {
  return audioObject({
    startLoopTimeUs: 2_000_000,
    endLoopTimeUs: 6_000_000,
    loopCrossfadeDurationUs: 1_000_000,
  });
}

function audioObject(overrides: Partial<AudioObjectDto> = {}): AudioObjectDto {
  return {
    id: testId.audioObject("audio-1"),
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
