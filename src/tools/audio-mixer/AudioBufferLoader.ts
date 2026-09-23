import { convertFileSrc } from "@tauri-apps/api/core";
import type { AudioAssetDto } from "@/api";
import { RuntimeError, normalizeRuntimeError } from "@/runtime";

interface AudioBufferLoaderOptions {
  context: BaseAudioContext;
  resolvePath: (assetPath: string) => Promise<string>;
  fetcher?: typeof fetch;
  assetUrl?: (path: string) => string;
}

export class AudioBufferLoader {
  readonly #context: BaseAudioContext;
  readonly #resolvePath: (assetPath: string) => Promise<string>;
  readonly #fetcher: typeof fetch;
  readonly #assetUrl: (path: string) => string;
  readonly #cache = new Map<string, Promise<AudioBuffer>>();

  constructor({
    context,
    resolvePath,
    fetcher = fetchAsset,
    assetUrl = convertFileSrc,
  }: AudioBufferLoaderOptions) {
    this.#context = context;
    this.#resolvePath = resolvePath;
    this.#fetcher = fetcher;
    this.#assetUrl = assetUrl;
  }

  load(file: AudioAssetDto) {
    const cached = this.#cache.get(file.relativePath);
    if (cached) return cached;
    const loading = this.#load(file).catch((cause: unknown) => {
      this.#cache.delete(file.relativePath);
      throw normalizeRuntimeError(cause, {
        code: "AUDIO_LOAD_FAILED",
        message: `Não foi possível carregar ${file.name}.`,
        operation: "load_audio_file",
        entityId: file.relativePath,
        recoverable: true,
      });
    });
    this.#cache.set(file.relativePath, loading);
    return loading;
  }

  clear() {
    this.#cache.clear();
  }

  async #load(file: AudioAssetDto) {
    const path = await this.#resolvePath(file.relativePath);
    const response = await this.#fetcher(this.#assetUrl(path));
    if (!response.ok) {
      throw new RuntimeError({
        code: "AUDIO_LOAD_FAILED",
        message: `Não foi possível carregar ${file.name}.`,
        operation: "fetch_audio_file",
        entityId: file.relativePath,
        details: `Asset request returned HTTP ${response.status}.`,
        recoverable: true,
      });
    }
    try {
      return await this.#context.decodeAudioData(await response.arrayBuffer());
    } catch (cause) {
      throw normalizeRuntimeError(cause, {
        code: "AUDIO_DECODE_FAILED",
        message: `Não foi possível decodificar ${file.name}.`,
        operation: "decode_audio_file",
        entityId: file.relativePath,
        recoverable: true,
      });
    }
  }
}

function fetchAsset(input: RequestInfo | URL, init?: RequestInit) {
  return init ? fetch(input, init) : fetch(input);
}
