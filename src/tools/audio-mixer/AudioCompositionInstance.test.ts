import { describe, expect, it, vi } from "vitest";
import type { AudioCompositionDto, CompositionLayerDto } from "@/api";
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

    instance.setEnabled("stop-layer", true);
    instance.setEnabled("finish-layer", true);
    await Promise.resolve();
    instance.setEnabled("stop-layer", false);
    instance.setEnabled("finish-layer", false);

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

    instance.setEnabled("interval", true);
    expect(timer.callbacks.size).toBe(1);
    instance.dispose();
    timer.runNext();

    expect(shape.play).not.toHaveBeenCalled();
    expect(() => instance.setEnabled("interval", true)).toThrowError(
      expect.objectContaining({ code: "AUDIO_COMPOSITION_DISPOSED" }),
    );
  });
});

function composition(layers: CompositionLayerDto[]): AudioCompositionDto {
  return { id: "composition-1", name: "Storm", layers };
}

function layer(
  id: string,
  disableBehavior: "stop" | "finish",
  interval = false,
): CompositionLayerDto {
  return {
    id,
    name: id,
    position: 0,
    source: { kind: "audioObject", audioObjectId: "audio-1" },
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
