import type { AudioLoopRegionConfig, AudioObjectConfig, AudioRegionConfig } from "./types";

export const REGION_STEP_SECONDS = 0.1;

type AudioRegions = {
  playableRegion: AudioRegionConfig;
  loopRegion: AudioLoopRegionConfig;
};

export type AudioRegionBounds = {
  playableStart: number;
  playableEnd: number;
  loopStart: number;
  loopEnd: number;
};

export function clampSeconds(value: number, min: number, max: number): number {
  const finiteValue = Number.isFinite(value) ? value : min;

  return Math.min(Math.max(finiteValue, min), max);
}

export function roundSeconds(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseSecondsInput(value: string): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? roundSeconds(Math.max(0, parsedValue)) : 0;
}

export function parseOptionalSecondsInput(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? roundSeconds(Math.max(0, parsedValue)) : null;
}

export function normalizeAudioObjectConfig(
  audioObject: AudioObjectConfig,
  duration?: number
): AudioObjectConfig {
  const regions = normalizeAudioRegions(
    audioObject.playableRegion,
    audioObject.loopRegion,
    duration
  );

  return {
    ...audioObject,
    defaultVolume: clampSeconds(audioObject.defaultVolume, 0, 1),
    fadeInMs: normalizeMilliseconds(audioObject.fadeInMs),
    fadeOutMs: normalizeMilliseconds(audioObject.fadeOutMs),
    ...regions,
  };
}

export function normalizeAudioRegions(
  playableRegion: AudioRegionConfig,
  loopRegion: AudioLoopRegionConfig,
  duration?: number
): AudioRegions {
  const hasDuration = typeof duration === "number" && Number.isFinite(duration);
  const maxDuration = hasDuration ? Math.max(REGION_STEP_SECONDS, duration) : undefined;
  const playableStartMax =
    maxDuration === undefined ? undefined : Math.max(0, maxDuration - REGION_STEP_SECONDS);
  const playableStart = normalizeStart(playableRegion.startSeconds, 0, playableStartMax);
  const playableEnd = normalizeEnd(
    playableRegion.endSeconds,
    playableStart + REGION_STEP_SECONDS,
    maxDuration
  );
  const effectivePlayableEnd = playableEnd ?? maxDuration;
  const loopStartMax =
    effectivePlayableEnd === undefined
      ? undefined
      : Math.max(playableStart, effectivePlayableEnd - REGION_STEP_SECONDS);
  const loopStart = normalizeStart(loopRegion.startSeconds, playableStart, loopStartMax);
  const loopEnd = normalizeEnd(
    loopRegion.endSeconds,
    loopStart + REGION_STEP_SECONDS,
    effectivePlayableEnd
  );

  return {
    playableRegion: {
      startSeconds: playableStart,
      endSeconds: playableEnd,
    },
    loopRegion: {
      enabled: loopRegion.enabled,
      startSeconds: loopStart,
      endSeconds: loopEnd,
    },
  };
}

export function getAudioRegionBounds(
  playableRegion: AudioRegionConfig,
  loopRegion: AudioLoopRegionConfig,
  duration: number
): AudioRegionBounds {
  const normalizedDuration = Math.max(REGION_STEP_SECONDS, duration);
  const regions = normalizeAudioRegions(playableRegion, loopRegion, normalizedDuration);
  const playableEnd = regions.playableRegion.endSeconds ?? normalizedDuration;
  const loopEnd = regions.loopRegion.endSeconds ?? playableEnd;

  return {
    playableStart: regions.playableRegion.startSeconds,
    playableEnd,
    loopStart: regions.loopRegion.startSeconds,
    loopEnd,
  };
}

function normalizeStart(value: number, min: number, max?: number): number {
  const finiteValue = Number.isFinite(value) ? value : min;
  const roundedValue = roundSeconds(Math.max(min, finiteValue));

  return max === undefined ? roundedValue : Math.min(roundedValue, max);
}

function normalizeEnd(value: number | null, min: number, max?: number): number | null {
  if (value === null) {
    return null;
  }

  const finiteValue = Number.isFinite(value) ? value : min;
  const roundedValue = roundSeconds(Math.max(min, finiteValue));

  return max === undefined ? roundedValue : Math.min(roundedValue, max);
}

function normalizeMilliseconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
