import { createEffect, createSignal, onCleanup } from "solid-js";
import type { AudioLoopRegionConfig, AudioRegionConfig } from "../audio/types";
import styles from "./AudioWaveform.module.scss";

type AudioWaveformProps = {
  filePath: string;
  playableRegion: AudioRegionConfig;
  loopRegion: AudioLoopRegionConfig;
  playheadSeconds?: number;
};

type WaveformData = {
  duration: number;
  peaks: number[];
};

const waveformCache = new Map<string, Promise<WaveformData>>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

    const duration = Math.max(0.001, data.duration);
    const playableStart = clamp(props.playableRegion.startSeconds, 0, duration);
    const playableEnd = clamp(props.playableRegion.endSeconds ?? duration, playableStart, duration);
    const loopStart = clamp(props.loopRegion.startSeconds, playableStart, playableEnd);
    const loopEnd = clamp(props.loopRegion.endSeconds ?? playableEnd, loopStart, playableEnd);
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

    context.strokeStyle = "rgba(206, 177, 255, 0.9)";
    context.lineWidth = Math.max(1, pixelRatio);

    [playableStart, playableEnd, loopStart, loopEnd].forEach((seconds) => {
      const x = getX(seconds);

      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    });

    if (typeof props.playheadSeconds === "number") {
      const playheadX = getX(clamp(props.playheadSeconds, 0, duration));
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

  createEffect(() => {
    let isCurrent = true;

    setError(undefined);
    setWaveform(undefined);

    void getWaveformData(props.filePath)
      .then((data) => {
        if (isCurrent) {
          setWaveform(data);
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
      <canvas ref={canvasRef} class={styles.canvas} aria-label="Forma de onda do audio" />
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
