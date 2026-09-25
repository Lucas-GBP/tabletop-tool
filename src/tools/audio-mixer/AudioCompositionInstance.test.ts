import { describe, expect, it, vi } from "vitest";
import type { AudioCompositionDto, CompositionLayerDto } from "@/api";
import { testId } from "@/test/ids";
import { AudioCompositionInstance } from "./AudioCompositionInstance";
import type { AudioMixer } from "./AudioMixer";
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

  runNext() {
    const next = this.callbacks.entries().next();
    if (next.done) return;
    this.callbacks.delete(next.value[0]);
    next.value[1]();
  }
}

function mixer() {
  const active = new Set<string>();
  let nextId = 0;
  const shape = {
    play: vi.fn(() => {
      nextId += 1;
      const id = `playback-${nextId}`;
      active.add(id);
      return Promise.resolve(id);
    }),
    hasPlayback: vi.fn((id: string) => active.has(id)),
    stop: vi.fn((id: string) => active.delete(id)),
    finish: vi.fn((id: string) => active.delete(id)),
  };
  return { shape, mixer: shape as unknown as AudioMixer };
}

describe("AudioCompositionInstance", () => {
  it("uses each layer disable behavior and releases active playbacks", async () => {
    const { mixer: audioMixer, shape } = mixer();
    const instance = new AudioCompositionInstance({
      definition: composition([
        layer("stop-layer", "stop"),
        layer("finish-layer", "finish"),
      ]),
      mixer: audioMixer,
      onError: vi.fn(),
    });

    instance.setEnabled(testId.compositionLayer("stop-layer"), true);
    instance.setEnabled(testId.compositionLayer("finish-layer"), true);
    await Promise.resolve();
    instance.setEnabled(testId.compositionLayer("stop-layer"), false);
    instance.setEnabled(testId.compositionLayer("finish-layer"), false);

    expect(shape.stop).toHaveBeenCalledWith("playback-1");
    expect(shape.finish).toHaveBeenCalledWith("playback-2");
  });

  it("cancels a pending interval when disposed", () => {
    const { mixer: audioMixer, shape } = mixer();
    const timer = new FakeTimer();
    const instance = new AudioCompositionInstance({
      definition: composition([layer("interval", "stop", true)]),
      mixer: audioMixer,
      onError: vi.fn(),
      timer,
      random: () => 0,
    });

    instance.setEnabled(testId.compositionLayer("interval"), true);
    expect(timer.callbacks.size).toBe(1);
    instance.dispose();
    timer.runNext();

    expect(shape.play).not.toHaveBeenCalled();
    expect(() =>
      instance.setEnabled(testId.compositionLayer("interval"), true),
    ).toThrowError(
      expect.objectContaining({ code: "AUDIO_COMPOSITION_DISPOSED" }),
    );
  });

  it("schedules the next random interval before playback resolves", () => {
    const timer = new FakeTimer();
    const first = deferred<string>();
    const play = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce("playback-2");
    const audioMixer = {
      play,
      hasPlayback: vi.fn(() => true),
      stop: vi.fn(),
      finish: vi.fn(),
    } as unknown as AudioMixer;
    const instance = new AudioCompositionInstance({
      definition: composition([layer("interval", "stop", true)]),
      mixer: audioMixer,
      onError: vi.fn(),
      timer,
      random: () => 0,
    });

    instance.setEnabled(testId.compositionLayer("interval"), true);
    timer.runNext();

    expect(play).toHaveBeenCalledOnce();
    expect(timer.callbacks.size).toBe(1);
    timer.runNext();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("keeps scheduling after a random playback failure", async () => {
    const timer = new FakeTimer();
    const onError = vi.fn();
    const audioMixer = {
      play: vi.fn(() => Promise.reject(new Error("decode failed"))),
      hasPlayback: vi.fn(() => false),
      stop: vi.fn(),
      finish: vi.fn(),
    } as unknown as AudioMixer;
    const instance = new AudioCompositionInstance({
      definition: composition([layer("interval", "stop", true)]),
      mixer: audioMixer,
      onError,
      timer,
      random: () => 0,
    });

    instance.setEnabled(testId.compositionLayer("interval"), true);
    timer.runNext();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledOnce();
    expect(timer.callbacks.size).toBe(1);
  });

  it("stops a late playback after disable and can be enabled again", async () => {
    const timer = new FakeTimer();
    const late = deferred<string>();
    const play = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce("playback-2");
    const stop = vi.fn();
    const audioMixer = {
      play,
      hasPlayback: vi.fn(() => true),
      stop,
      finish: vi.fn(),
    } as unknown as AudioMixer;
    const instance = new AudioCompositionInstance({
      definition: composition([layer("interval", "stop", true)]),
      mixer: audioMixer,
      onError: vi.fn(),
      timer,
      random: () => 0,
    });

    instance.setEnabled(testId.compositionLayer("interval"), true);
    timer.runNext();
    instance.setEnabled(testId.compositionLayer("interval"), false);
    expect(timer.callbacks.size).toBe(0);
    late.resolve("playback-1");
    await late.promise;
    await Promise.resolve();
    expect(stop).toHaveBeenCalledWith("playback-1");

    instance.setEnabled(testId.compositionLayer("interval"), true);
    expect(timer.callbacks.size).toBe(1);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function composition(layers: CompositionLayerDto[]): AudioCompositionDto {
  return {
    id: testId.audioComposition("composition-1"),
    name: "Storm",
    layers,
  };
}

function layer(
  id: string,
  disableBehavior: "stop" | "finish",
  interval = false,
): CompositionLayerDto {
  return {
    id: testId.compositionLayer(id),
    name: id,
    position: 0,
    source: {
      kind: "audioObject",
      audioObjectId: testId.audioObject("audio-1"),
    },
    execution: interval
      ? {
          kind: "randomInterval",
          minIntervalUs: 1_000_000,
          maxIntervalUs: 2_000_000,
        }
      : { kind: "continuous" },
    disableBehavior,
  };
}
