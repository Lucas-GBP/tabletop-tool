import { describe, expect, it, vi } from "vitest";
import type { AudioAssetDto, AudioObjectDto } from "@/api";
import { testId } from "@/test/ids";
import { AudioMixer } from "./AudioMixer";
import type { AudioBufferLoader } from "./AudioBufferLoader";

describe("AudioMixer", () => {
  it("updates the active master gain immediately", async () => {
    const { mixer, context, masterGain } = createFixture();
    await mixer.activate();

    mixer.setMasterVolumeDb(-6);

    expect(masterGain.gain.setValueAtTime.mock.calls[0]?.[0]).toBeCloseTo(
      0.501_187,
    );
    expect(masterGain.gain.setValueAtTime.mock.calls[0]?.[1]).toBe(
      context.currentTime,
    );
  });

  it("reports a changed asset and releases its pinned buffer", async () => {
    const release = vi.fn();
    const { mixer } = createFixture({
      file: audioFile({ durationUs: 1_000_000 }),
      object: audioObject({ endTimeUs: 1_000_000 }),
      buffer: audioBuffer(0.5),
      release,
    });

    await expect(
      mixer.play({ kind: "audioObject", id: testId.audioObject("audio-1") }),
    ).rejects.toMatchObject({
      code: "AUDIO_ASSET_CHANGED",
      operation: "play_audio_cue",
      recoverable: true,
    });
    expect(release).toHaveBeenCalledOnce();
    expect(mixer.activePlaybacks).toHaveLength(0);
  });

  it("releases pinned buffers when the mixer is disposed", async () => {
    const release = vi.fn();
    const { mixer, loader } = createFixture({ release });
    await mixer.play({
      kind: "audioObject",
      id: testId.audioObject("audio-1"),
    });

    mixer.dispose();

    expect(release).toHaveBeenCalledOnce();
    expect(loader.clear.mock.calls).toHaveLength(1);
    expect(mixer.activePlaybacks).toHaveLength(0);
  });
});

function createFixture(
  options: {
    file?: AudioAssetDto;
    object?: AudioObjectDto;
    buffer?: AudioBuffer;
    release?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const masterGain = gainNode();
  const playbackGains: ReturnType<typeof gainNode>[] = [];
  const context = {
    currentTime: 2,
    state: "running",
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => {
      if (playbackGains.length === 0) {
        playbackGains.push(masterGain);
        return masterGain;
      }
      const gain = gainNode();
      playbackGains.push(gain);
      return gain;
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
  } as unknown as AudioContext;
  const release = options.release ?? vi.fn();
  const loader = {
    acquire: vi.fn().mockResolvedValue({
      buffer: options.buffer ?? audioBuffer(1),
      release,
    }),
    clear: vi.fn(),
  } as unknown as AudioBufferLoader & { clear: ReturnType<typeof vi.fn> };
  const mixer = new AudioMixer({
    definitions: {
      files: [options.file ?? audioFile()],
      objects: [options.object ?? audioObject()],
      lists: [],
      compositions: [],
    },
    masterVolumeDb: 0,
    resolveFilePath: (path) => Promise.resolve(path),
    contextFactory: () => context,
    loaderFactory: () => loader,
  });
  return { mixer, context, masterGain, loader };
}

function gainNode() {
  return {
    gain: {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as GainNode & {
    gain: AudioParam & { setValueAtTime: ReturnType<typeof vi.fn> };
  };
}

function audioBuffer(duration: number) {
  return {
    duration,
    length: duration * 48_000,
    numberOfChannels: 2,
  } as AudioBuffer;
}

function audioFile(overrides: Partial<AudioAssetDto> = {}): AudioAssetDto {
  return {
    name: "Rain",
    originalFileName: "rain.wav",
    relativePath: "rain.wav",
    mediaType: "audio/wav",
    durationUs: 1_000_000,
    sizeBytes: 4,
    ...overrides,
  };
}

function audioObject(overrides: Partial<AudioObjectDto> = {}): AudioObjectDto {
  return {
    id: testId.audioObject("audio-1"),
    name: "Rain",
    assetPath: "rain.wav",
    volumeDb: 0,
    startTimeUs: 0,
    endTimeUs: 1_000_000,
    startLoopTimeUs: null,
    endLoopTimeUs: null,
    fadeInDurationUs: 0,
    fadeOutDurationUs: 0,
    loopCrossfadeDurationUs: null,
    ...overrides,
  };
}
