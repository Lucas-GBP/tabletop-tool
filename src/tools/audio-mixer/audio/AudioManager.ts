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
  startedAt: number;
  playbackRegion: PlaybackRegion;
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
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    const playbackRegion = this.getPlaybackRegion(audioObject, buffer.duration);
    const preview = {
      source,
      gainNode,
      startedAt: context.currentTime,
      playbackRegion,
      onTimeUpdate: options.onTimeUpdate,
    };

    source.buffer = buffer;
    source.loop = playbackRegion.loopEnabled;

    if (playbackRegion.loopEnabled) {
      source.loopStart = playbackRegion.loopStart;
      source.loopEnd = playbackRegion.loopEnd;
    }

    gainNode.gain.value = options.volume ?? audioObject.defaultVolume;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.onended = () => {
      if (this.preview?.source === source) {
        this.cleanupPreview(preview);
        options.onEnded?.();
      }
    };

    this.preview = preview;
    this.startPreviewProgress(preview);

    if (playbackRegion.loopEnabled) {
      source.start(0, playbackRegion.start);
      return;
    }

    source.start(0, playbackRegion.start, playbackRegion.duration);
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
    const start = this.clampSeconds(
      audioObject.playableRegion.startSeconds,
      0,
      Math.max(0, bufferDuration - minimumDuration)
    );
    const end = this.clampSeconds(
      audioObject.playableRegion.endSeconds ?? bufferDuration,
      start + minimumDuration,
      bufferDuration
    );
    const duration = Math.max(minimumDuration, end - start);

    if (!audioObject.loopRegion.enabled) {
      return {
        start,
        duration,
        loopEnabled: false,
        loopStart: start,
        loopEnd: end,
      };
    }

    const loopStart = this.clampSeconds(audioObject.loopRegion.startSeconds, start, end);
    const loopEnd = this.clampSeconds(audioObject.loopRegion.endSeconds ?? end, loopStart, end);

    return {
      start,
      duration,
      loopEnabled: loopEnd > loopStart,
      loopStart,
      loopEnd,
    };
  }

  private clampSeconds(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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
