import { convertFileSrc } from "@tauri-apps/api/core";
import type { AudioAssetDto } from "@/api";
import { RuntimeError, normalizeRuntimeError } from "@/runtime";

interface AudioBufferLoaderOptions {
  context: BaseAudioContext;
  resolvePath: (assetPath: string) => Promise<string>;
  fetcher?: typeof fetch;
  assetUrl?: (path: string) => string;
  maxDecodedBytes?: number;
}

interface CacheEntry {
  readonly promise: Promise<AudioBuffer>;
  buffer?: AudioBuffer;
  decodedBytes: number;
  lastUsed: number;
  pins: number;
}

export interface AudioBufferLease {
  readonly buffer: AudioBuffer;
  release(): void;
}

const defaultMaxDecodedBytes = 256 * 1024 * 1024;

export class AudioBufferLoader {
  readonly #context: BaseAudioContext;
  readonly #resolvePath: (assetPath: string) => Promise<string>;
  readonly #fetcher: typeof fetch;
  readonly #assetUrl: (path: string) => string;
  readonly #maxDecodedBytes: number;
  readonly #cache = new Map<string, CacheEntry>();
  #decodedBytes = 0;
  #usageSequence = 0;

  constructor({
    context,
    resolvePath,
    fetcher = fetchAsset,
    assetUrl = convertFileSrc,
    maxDecodedBytes = defaultMaxDecodedBytes,
  }: AudioBufferLoaderOptions) {
    this.#context = context;
    this.#resolvePath = resolvePath;
    this.#fetcher = fetcher;
    this.#assetUrl = assetUrl;
    this.#maxDecodedBytes = Math.max(0, maxDecodedBytes);
  }

  get stats() {
    return {
      entries: this.#cache.size,
      decodedBytes: this.#decodedBytes,
      maxDecodedBytes: this.#maxDecodedBytes,
      pinnedEntries: [...this.#cache.values()].filter((entry) => entry.pins > 0)
        .length,
    } as const;
  }

  async acquire(file: AudioAssetDto): Promise<AudioBufferLease> {
    const key = file.relativePath;
    let entry = this.#cache.get(key);
    if (!entry) {
      const loading = this.#load(file).catch((cause: unknown) => {
        this.#cache.delete(key);
        throw normalizeRuntimeError(cause, {
          code: "AUDIO_LOAD_FAILED",
          message: `Não foi possível carregar ${file.name}.`,
          operation: "load_audio_file",
          entityId: key,
          recoverable: true,
        });
      });
      const createdEntry: CacheEntry = {
        promise: loading,
        decodedBytes: 0,
        lastUsed: ++this.#usageSequence,
        pins: 0,
      };
      entry = createdEntry;
      this.#cache.set(key, entry);
      void loading.then(
        (buffer) => {
          if (this.#cache.get(key) !== createdEntry) return;
          createdEntry.buffer = buffer;
          createdEntry.decodedBytes = decodedAudioBytes(buffer);
          this.#decodedBytes += createdEntry.decodedBytes;
          this.#evict();
        },
        () => undefined,
      );
    }

    entry.pins += 1;
    entry.lastUsed = ++this.#usageSequence;
    try {
      const buffer = await entry.promise;
      let released = false;
      return {
        buffer,
        release: () => {
          if (released) return;
          released = true;
          entry.pins = Math.max(0, entry.pins - 1);
          entry.lastUsed = ++this.#usageSequence;
          this.#evict();
        },
      };
    } catch (cause) {
      entry.pins = Math.max(0, entry.pins - 1);
      throw cause;
    }
  }

  clear() {
    for (const [key, entry] of this.#cache) {
      if (entry.pins === 0) this.#remove(key, entry);
    }
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

  #evict() {
    while (this.#decodedBytes > this.#maxDecodedBytes) {
      const candidate = [...this.#cache.entries()]
        .filter(([, entry]) => entry.buffer && entry.pins === 0)
        .sort((left, right) => left[1].lastUsed - right[1].lastUsed)[0];
      if (!candidate) return;
      this.#remove(candidate[0], candidate[1]);
    }
  }

  #remove(key: string, entry: CacheEntry) {
    if (this.#cache.get(key) !== entry) return;
    this.#cache.delete(key);
    this.#decodedBytes = Math.max(0, this.#decodedBytes - entry.decodedBytes);
  }
}

function decodedAudioBytes(buffer: AudioBuffer) {
  return Math.max(
    0,
    buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT,
  );
}

function fetchAsset(input: RequestInfo | URL, init?: RequestInit) {
  return init ? fetch(input, init) : fetch(input);
}
