import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudioAssetDto } from "@/api";
import { AudioBufferLoader } from "./AudioBufferLoader";

afterEach(() => vi.unstubAllGlobals());

describe("AudioBufferLoader", () => {
  it("calls the browser fetch function with a valid receiver", async () => {
    const bytes = new ArrayBuffer(4);
    const decoded = { duration: 1 } as AudioBuffer;
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes),
      } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);
    const decodeAudioData = vi.fn().mockResolvedValue(decoded);
    const loader = new AudioBufferLoader({
      context: { decodeAudioData } as unknown as BaseAudioContext,
      resolvePath: vi.fn().mockResolvedValue("C:/audio/example.mp3"),
      assetUrl: (path) => `asset://${path}`,
    });
    const file: AudioAssetDto = {
      name: "Example",
      originalFileName: "example.mp3",
      relativePath: "example.mp3",
      mediaType: "audio/mpeg",
      durationUs: 1_000_000,
      sizeBytes: 4,
    };

    await expect(loader.load(file)).resolves.toBe(decoded);
    expect(fetchMock).toHaveBeenCalledWith("asset://C:/audio/example.mp3");
    expect(decodeAudioData).toHaveBeenCalledWith(bytes);
  });
});
