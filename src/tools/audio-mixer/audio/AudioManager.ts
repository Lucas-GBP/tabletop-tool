import { getAudioRegionBounds } from "./audioRegions";
import type { AudioObjectConfig } from "./types";

type PlaybackRegion = {
  start: number;
  duration: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
};

type PreviewAudio = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  buffer: AudioBuffer;
  startedAt: number;
  volume: number;
  playbackRegion: PlaybackRegion;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  progressFrame?: number;
};

export class AudioManager {
  private context?: AudioContext;
  private preview?: PreviewAudio;

  async init(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async previewAudioObject(
    audioObject: AudioObjectConfig,
    options: {
      volume?: number;
      onEnded?: () => void;
      onTimeUpdate?: (seconds: number) => void;
    } = {}
  ): Promise<void> {
    const context = this.getContext();

    this.stopPreview();

    const buffer = await this.loadBuffer(audioObject.filePath);
    const playbackRegion = this.getPlaybackRegion(audioObject, buffer.duration);
    const preview = {
      source: context.createBufferSource(),
      gainNode: context.createGain(),
      buffer,
      startedAt: 0,
      volume: options.volume ?? audioObject.defaultVolume,
      playbackRegion,
      onEnded: options.onEnded,
      onTimeUpdate: options.onTimeUpdate,
    };

    this.preview = preview;
    this.restartPreviewAt(preview, playbackRegion.start);
  }

  stopPreview(): void {
    const preview = this.preview;

    if (!preview) {
      return;
    }

    try {
      preview.source.stop();
    } finally {
      this.cleanupPreview(preview);
    }
  }

  seekPreview(seconds: number): number | undefined {
    const preview = this.preview;

    if (!preview) {
      return undefined;
    }

    const seekSeconds = this.clampSeekSeconds(preview.playbackRegion, seconds);

    this.restartPreviewAt(preview, seekSeconds);

    return seekSeconds;
  }

  private getContext(): AudioContext {
    if (!this.context) {
      throw new Error("AudioManager.init() must be called before use.");
    }

    return this.context;
  }

  private async loadBuffer(filePath: string): Promise<AudioBuffer> {
    const context = this.getContext();
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Could not load audio file: ${filePath}`);
    }

    return context.decodeAudioData(await response.arrayBuffer());
  }

  private getPlaybackRegion(
    audioObject: AudioObjectConfig,
    bufferDuration: number
  ): PlaybackRegion {
    const minimumDuration = 0.001;
    const bounds = getAudioRegionBounds(
      audioObject.playableRegion,
      audioObject.loopRegion,
      bufferDuration
    );
    const duration = Math.max(minimumDuration, bounds.playableEnd - bounds.playableStart);

    if (!audioObject.loopRegion.enabled) {
      return {
        start: bounds.playableStart,
        duration,
        loopEnabled: false,
        loopStart: bounds.playableStart,
        loopEnd: bounds.playableEnd,
      };
    }

    return {
      start: bounds.playableStart,
      duration,
      loopEnabled: bounds.loopEnd > bounds.loopStart,
      loopStart: bounds.loopStart,
      loopEnd: bounds.loopEnd,
    };
  }

  private clampSeconds(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private clampSeekSeconds(region: PlaybackRegion, seconds: number): number {
    const minimumDuration = 0.001;
    const end = region.loopEnabled ? region.loopEnd : region.start + region.duration;
    const max = Math.max(region.start, end - minimumDuration);

    return this.clampSeconds(seconds, region.start, max);
  }

  private restartPreviewAt(preview: PreviewAudio, seconds: number): void {
    const context = this.getContext();
    const previousSource = preview.source;
    const previousGainNode = preview.gainNode;
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    const startSeconds = this.clampSeekSeconds(preview.playbackRegion, seconds);

    if (preview.progressFrame !== undefined) {
      window.cancelAnimationFrame(preview.progressFrame);
      preview.progressFrame = undefined;
    }

    preview.source = source;
    preview.gainNode = gainNode;
    preview.startedAt = this.getStartedAtForOffset(preview, startSeconds);

    source.buffer = preview.buffer;
    source.loop = preview.playbackRegion.loopEnabled;

    if (preview.playbackRegion.loopEnabled) {
      source.loopStart = preview.playbackRegion.loopStart;
      source.loopEnd = preview.playbackRegion.loopEnd;
    }

    gainNode.gain.value = preview.volume;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.onended = () => {
      if (this.preview?.source === source) {
        this.cleanupPreview(preview);
        preview.onEnded?.();
      }
    };

    try {
      previousSource.stop();
    } catch {
      // The previous source may have ended naturally before a seek operation.
    } finally {
      previousSource.disconnect();
      previousGainNode.disconnect();
    }

    this.startSource(source, preview.playbackRegion, startSeconds);
    this.startPreviewProgress(preview);
  }

  private startSource(
    source: AudioBufferSourceNode,
    region: PlaybackRegion,
    seconds: number
  ): void {
    if (region.loopEnabled) {
      source.start(0, seconds);
      return;
    }

    source.start(0, seconds, Math.max(0.001, region.start + region.duration - seconds));
  }

  private getStartedAtForOffset(preview: PreviewAudio, seconds: number): number {
    const context = this.getContext();
    const region = preview.playbackRegion;

    if (!region.loopEnabled || seconds <= region.loopEnd) {
      return context.currentTime - Math.max(0, seconds - region.start);
    }

    const introDuration = Math.max(0, region.loopEnd - region.start);
    const loopDuration = Math.max(0.001, region.loopEnd - region.loopStart);

    return context.currentTime - introDuration - ((seconds - region.loopStart) % loopDuration);
  }

  private startPreviewProgress(preview: PreviewAudio): void {
    const tick = () => {
      if (this.preview !== preview) {
        return;
      }

      preview.onTimeUpdate?.(this.getPreviewTime(preview));
      preview.progressFrame = window.requestAnimationFrame(tick);
    };

    tick();
  }

  private getPreviewTime(preview: PreviewAudio): number {
    const context = this.getContext();
    const elapsed = Math.max(0, context.currentTime - preview.startedAt);
    const region = preview.playbackRegion;

    if (!region.loopEnabled) {
      return this.clampSeconds(
        region.start + elapsed,
        region.start,
        region.start + region.duration
      );
    }

    const introDuration = Math.max(0, region.loopEnd - region.start);

    if (elapsed <= introDuration) {
      return this.clampSeconds(region.start + elapsed, region.start, region.loopEnd);
    }

    const loopDuration = Math.max(0.001, region.loopEnd - region.loopStart);

    return region.loopStart + ((elapsed - introDuration) % loopDuration);
  }

  private cleanupPreview(preview: PreviewAudio): void {
    try {
      if (preview.progressFrame !== undefined) {
        window.cancelAnimationFrame(preview.progressFrame);
      }
      preview.source.disconnect();
      preview.gainNode.disconnect();
    } finally {
      if (this.preview === preview) {
        this.preview = undefined;
      }
    }
  }
}
