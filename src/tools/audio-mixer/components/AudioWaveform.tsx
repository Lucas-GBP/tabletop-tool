import { createEffect, createSignal, onCleanup } from "solid-js";
import {
  REGION_STEP_SECONDS,
  clampSeconds,
  getAudioRegionBounds,
  normalizeAudioRegions,
  roundSeconds,
} from "../audio/audioRegions";
import type { AudioLoopRegionConfig, AudioRegionConfig } from "../audio/types";
import styles from "./AudioWaveform.module.scss";

type AudioWaveformProps = {
  filePath: string;
  playableRegion: AudioRegionConfig;
  loopRegion: AudioLoopRegionConfig;
  playheadSeconds?: number;
  onDurationChange?: (duration?: number) => void;
  onRegionsChange?: (regions: {
    playableRegion: AudioRegionConfig;
    loopRegion: AudioLoopRegionConfig;
  }) => void;
  onSeek?: (seconds: number) => void;
};

type WaveformData = {
  duration: number;
  peaks: number[];
};

type RegionMarker = "playableStart" | "playableEnd" | "loopStart" | "loopEnd";

const MARKER_HIT_RADIUS_PX = 18;
const waveformCache = new Map<string, Promise<WaveformData>>();

async function getWaveformData(filePath: string): Promise<WaveformData> {
  const cachedWaveform = waveformCache.get(filePath);

  if (cachedWaveform) {
    return cachedWaveform;
  }

  const waveformPromise = fetch(filePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Nao foi possivel carregar a forma de onda.");
      }

      return response.arrayBuffer();
    })
    .then(async (arrayBuffer) => {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(arrayBuffer);
      await context.close();

      const peaks = createPeaks(buffer, 900);

      return {
        duration: buffer.duration,
        peaks,
      };
    });

  waveformCache.set(filePath, waveformPromise);

  return waveformPromise;
}

function createPeaks(buffer: AudioBuffer, peakCount: number): number[] {
  const peaks: number[] = [];
  const samplesPerPeak = Math.max(1, Math.floor(buffer.length / peakCount));

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
    const startSample = peakIndex * samplesPerPeak;
    const endSample = Math.min(buffer.length, startSample + samplesPerPeak);
    let maxSample = 0;

    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channelData = buffer.getChannelData(channelIndex);

      for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
        maxSample = Math.max(maxSample, Math.abs(channelData[sampleIndex] ?? 0));
      }
    }

    peaks.push(maxSample);
  }

  return peaks;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function AudioWaveform(props: AudioWaveformProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  const [waveform, setWaveform] = createSignal<WaveformData>();
  const [error, setError] = createSignal<string>();
  const [activeMarker, setActiveMarker] = createSignal<RegionMarker>();
  const [isSeeking, setIsSeeking] = createSignal(false);

  const drawWaveform = () => {
    const canvas = canvasRef;
    const data = waveform();

    if (!canvas || !data) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * pixelRatio));
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);

    const duration = Math.max(REGION_STEP_SECONDS, data.duration);
    const { playableStart, playableEnd, loopStart, loopEnd } = getAudioRegionBounds(
      props.playableRegion,
      props.loopRegion,
      duration
    );
    const getX = (seconds: number) => (seconds / duration) * width;

    context.fillStyle = "rgba(255, 255, 255, 0.035)";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(127, 155, 255, 0.14)";
    context.fillRect(
      getX(playableStart),
      0,
      Math.max(1, getX(playableEnd) - getX(playableStart)),
      height
    );

    if (props.loopRegion.enabled && loopEnd > loopStart) {
      context.fillStyle = "rgba(172, 126, 255, 0.22)";
      context.fillRect(getX(loopStart), 0, Math.max(1, getX(loopEnd) - getX(loopStart)), height);
    }

    const centerY = height / 2;
    const waveformHeight = height * 0.74;
    const barWidth = Math.max(1, width / data.peaks.length);

    context.fillStyle = "rgba(242, 238, 255, 0.72)";
    data.peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(1, peak * waveformHeight);

      context.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth * 0.74), barHeight);
    });

    const drawMarker = (marker: RegionMarker, seconds: number, color: string) => {
      const x = getX(seconds);
      const isActive = activeMarker() === marker;

      context.strokeStyle = isActive ? "rgba(255, 255, 255, 0.98)" : color;
      context.lineWidth = Math.max(isActive ? 3 : 1, (isActive ? 3 : 1) * pixelRatio);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    };

    drawMarker("playableStart", playableStart, "rgba(145, 217, 204, 0.92)");
    drawMarker("playableEnd", playableEnd, "rgba(145, 217, 204, 0.92)");

    if (props.loopRegion.enabled) {
      drawMarker("loopStart", loopStart, "rgba(198, 168, 255, 0.94)");
      drawMarker("loopEnd", loopEnd, "rgba(198, 168, 255, 0.94)");
    }

    if (typeof props.playheadSeconds === "number") {
      const playheadX = getX(clampSeconds(props.playheadSeconds, 0, duration));
      const headSize = 7 * pixelRatio;

      context.strokeStyle = "rgba(255, 255, 255, 0.96)";
      context.lineWidth = Math.max(2, 2 * pixelRatio);
      context.beginPath();
      context.moveTo(playheadX, 0);
      context.lineTo(playheadX, height);
      context.stroke();

      context.fillStyle = "rgba(255, 255, 255, 0.96)";
      context.beginPath();
      context.moveTo(playheadX, 0);
      context.lineTo(playheadX - headSize, headSize);
      context.lineTo(playheadX + headSize, headSize);
      context.closePath();
      context.fill();
    }
  };

  const getSecondsFromPointer = (event: PointerEvent, duration: number): number | undefined => {
    const canvas = canvasRef;

    if (!canvas) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    const position = clampSeconds((event.clientX - rect.left) / rect.width, 0, 1);

    return roundSeconds(position * duration);
  };

  const getEndSecondsValue = (seconds: number, duration: number): number | null =>
    seconds >= duration - REGION_STEP_SECONDS ? null : seconds;

  const getNearestMarker = (event: PointerEvent, data: WaveformData): RegionMarker | undefined => {
    const canvas = canvasRef;

    if (!canvas) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const duration = Math.max(REGION_STEP_SECONDS, data.duration);
    const bounds = getAudioRegionBounds(props.playableRegion, props.loopRegion, duration);
    const markers: Array<{ marker: RegionMarker; seconds: number }> = [
      { marker: "playableStart", seconds: bounds.playableStart },
      { marker: "playableEnd", seconds: bounds.playableEnd },
    ];

    if (props.loopRegion.enabled) {
      markers.push(
        { marker: "loopStart", seconds: bounds.loopStart },
        { marker: "loopEnd", seconds: bounds.loopEnd }
      );
    }

    const nearest = markers
      .map((item) => ({
        ...item,
        distance: Math.abs(pointerX - (item.seconds / duration) * rect.width),
      }))
      .sort((left, right) => left.distance - right.distance)[0];

    return nearest && nearest.distance <= MARKER_HIT_RADIUS_PX ? nearest.marker : undefined;
  };

  const getSeekSeconds = (event: PointerEvent, data: WaveformData): number | undefined => {
    const duration = Math.max(REGION_STEP_SECONDS, data.duration);
    const seconds = getSecondsFromPointer(event, duration);

    if (seconds === undefined) {
      return undefined;
    }

    const bounds = getAudioRegionBounds(props.playableRegion, props.loopRegion, duration);
    const seekEnd = props.loopRegion.enabled ? bounds.loopEnd : bounds.playableEnd;

    return clampSeconds(seconds, bounds.playableStart, seekEnd);
  };

  const commitSeek = (event: PointerEvent) => {
    const data = waveform();
    const seconds = data ? getSeekSeconds(event, data) : undefined;

    if (seconds === undefined || !props.onSeek) {
      return;
    }

    props.onSeek(seconds);
  };

  const commitMarkerChange = (marker: RegionMarker, event: PointerEvent) => {
    const data = waveform();
    const seconds = data
      ? getSecondsFromPointer(event, Math.max(REGION_STEP_SECONDS, data.duration))
      : undefined;

    if (!data || seconds === undefined || !props.onRegionsChange) {
      return;
    }

    const duration = Math.max(REGION_STEP_SECONDS, data.duration);
    const playableRegion = { ...props.playableRegion };
    const loopRegion = { ...props.loopRegion };

    switch (marker) {
      case "playableStart":
        playableRegion.startSeconds = seconds;
        break;
      case "playableEnd":
        playableRegion.endSeconds = getEndSecondsValue(seconds, duration);
        break;
      case "loopStart":
        loopRegion.startSeconds = seconds;
        break;
      case "loopEnd":
        loopRegion.endSeconds = getEndSecondsValue(seconds, duration);
        break;
    }

    props.onRegionsChange(normalizeAudioRegions(playableRegion, loopRegion, duration));
  };

  const startMarkerDrag = (event: PointerEvent) => {
    const data = waveform();

    if (!data || !canvasRef) {
      return;
    }

    const marker = props.onRegionsChange ? getNearestMarker(event, data) : undefined;

    if (!marker && !props.onSeek) {
      return;
    }

    event.preventDefault();
    canvasRef.setPointerCapture(event.pointerId);

    if (marker) {
      setActiveMarker(marker);
      commitMarkerChange(marker, event);
      return;
    }

    setIsSeeking(true);
    commitSeek(event);
  };

  const dragMarker = (event: PointerEvent) => {
    const marker = activeMarker();

    if (!marker && !isSeeking()) {
      return;
    }

    event.preventDefault();

    if (marker) {
      commitMarkerChange(marker, event);
      return;
    }

    commitSeek(event);
  };

  const stopMarkerDrag = (event: PointerEvent) => {
    if (!activeMarker() && !isSeeking()) {
      return;
    }

    if (canvasRef?.hasPointerCapture(event.pointerId)) {
      canvasRef.releasePointerCapture(event.pointerId);
    }

    setActiveMarker(undefined);
    setIsSeeking(false);
  };

  createEffect(() => {
    let isCurrent = true;
    const onDurationChange = props.onDurationChange;

    setError(undefined);
    setWaveform(undefined);
    onDurationChange?.(undefined);

    void getWaveformData(props.filePath)
      .then((data) => {
        if (isCurrent) {
          setWaveform(data);
          onDurationChange?.(data.duration);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar a forma de onda."
          );
        }
      });

    onCleanup(() => {
      isCurrent = false;
    });
  });

  createEffect(() => {
    waveform();
    activeMarker();
    isSeeking();
    drawWaveform();
  });

  createEffect(() => {
    if (!canvasRef) {
      return;
    }

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => drawWaveform());
    resizeObserver.observe(canvasRef);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  return (
    <div class={styles.root}>
      <canvas
        ref={canvasRef}
        class={styles.canvas}
        classList={{
          [styles.editable]: Boolean(props.onRegionsChange),
          [styles.seekable]: Boolean(props.onSeek),
        }}
        aria-label="Forma de onda do audio"
        onPointerDown={startMarkerDrag}
        onPointerMove={dragMarker}
        onPointerUp={stopMarkerDrag}
        onPointerCancel={stopMarkerDrag}
      />
      <div class={styles.meta}>
        <span>
          {waveform()
            ? `${typeof props.playheadSeconds === "number" ? `${formatSeconds(props.playheadSeconds)} / ` : ""}${formatSeconds(
                waveform()?.duration ?? 0
              )}`
            : "Carregando..."}
        </span>
        <span>{error()}</span>
      </div>
    </div>
  );
}
