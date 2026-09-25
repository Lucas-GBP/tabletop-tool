import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudioAssetDto } from "@/api";
import { AudioBufferLoader } from "./AudioBufferLoader";

afterEach(() => vi.unstubAllGlobals());

describe("AudioBufferLoader", () => {
  it("calls the browser fetch function with a valid receiver", async () => {
    const bytes = new ArrayBuffer(4);
    const decoded = audioBuffer(1);
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(response(bytes));
    });
    vi.stubGlobal("fetch", fetchMock);
    const decodeAudioData = vi.fn().mockResolvedValue(decoded);
    const loader = new AudioBufferLoader({
      context: { decodeAudioData } as unknown as BaseAudioContext,
      resolvePath: vi.fn().mockResolvedValue("C:/audio/example.mp3"),
      assetUrl: (path) => `asset://${path}`,
    });

    const lease = await loader.acquire(file("example.mp3"));

    expect(lease.buffer).toBe(decoded);
    expect(fetchMock).toHaveBeenCalledWith("asset://C:/audio/example.mp3");
    expect(decodeAudioData).toHaveBeenCalledWith(bytes);
    lease.release();
  });

  it("decodes an asset once while it remains cached", async () => {
    const decodeAudioData = vi.fn().mockResolvedValue(audioBuffer(2));
    const loader = createLoader(decodeAudioData, 32);

    const first = await loader.acquire(file("rain.wav"));
    first.release();
    const second = await loader.acquire(file("rain.wav"));

    expect(decodeAudioData).toHaveBeenCalledOnce();
    expect(loader.stats).toEqual({
      entries: 1,
      decodedBytes: 8,
      maxDecodedBytes: 32,
      pinnedEntries: 1,
    });
    second.release();
  });

  it("evicts the least recently used unpinned buffer", async () => {
    const decodeAudioData = vi
      .fn()
      .mockImplementation(() => Promise.resolve(audioBuffer(2)));
    const loader = createLoader(decodeAudioData, 16);
    const first = await loader.acquire(file("first.wav"));
    first.release();
    const second = await loader.acquire(file("second.wav"));
    second.release();
    const refreshed = await loader.acquire(file("first.wav"));
    refreshed.release();
    const third = await loader.acquire(file("third.wav"));
    third.release();

    await loader.acquire(file("second.wav"));

    expect(decodeAudioData).toHaveBeenCalledTimes(4);
  });

  it("keeps active buffers pinned until playback releases them", async () => {
    const decodeAudioData = vi.fn().mockResolvedValue(audioBuffer(2));
    const loader = createLoader(decodeAudioData, 8);
    const first = await loader.acquire(file("first.wav"));
    const second = await loader.acquire(file("second.wav"));

    expect(loader.stats).toMatchObject({
      entries: 2,
      decodedBytes: 16,
      pinnedEntries: 2,
    });
    second.release();
    expect(loader.stats).toMatchObject({ entries: 1, decodedBytes: 8 });
    first.release();
    loader.clear();
    expect(loader.stats).toMatchObject({ entries: 0, decodedBytes: 0 });
  });
});

function createLoader(
  decodeAudioData: ReturnType<typeof vi.fn>,
  maxDecodedBytes: number,
) {
  return new AudioBufferLoader({
    context: { decodeAudioData } as unknown as BaseAudioContext,
    resolvePath: (path) => Promise.resolve(path),
    fetcher: vi.fn().mockResolvedValue(response(new ArrayBuffer(4))),
    assetUrl: (path) => path,
    maxDecodedBytes,
  });
}

function audioBuffer(length: number) {
  return { duration: 1, length, numberOfChannels: 1 } as AudioBuffer;
}

function response(bytes: ArrayBuffer) {
  return {
    ok: true,
    arrayBuffer: () => Promise.resolve(bytes),
  } as Response;
}

function file(relativePath: string): AudioAssetDto {
  return {
    name: relativePath,
    originalFileName: relativePath,
    relativePath,
    mediaType: "audio/wav",
    durationUs: 1_000_000,
    sizeBytes: 4,
  };
}
