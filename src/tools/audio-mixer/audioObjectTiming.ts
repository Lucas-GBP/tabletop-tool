import type { AudioObjectInputDto } from "@/api";
import { clamp, microsecondsPerSecond } from "./audioMath";

export function audioBufferDurationUs(buffer: Pick<AudioBuffer, "duration">) {
  return Math.max(1, Math.floor(buffer.duration * microsecondsPerSecond));
}

export function fitAudioObjectToDuration<T extends AudioObjectInputDto>(
  definition: T,
  durationUs: number,
): T {
  const endLimitUs = Math.max(1, Math.floor(durationUs));
  const endTimeUs = clamp(definition.endTimeUs, 1, endLimitUs);
  const startTimeUs = clamp(definition.startTimeUs, 0, endTimeUs - 1);
  const playbackDurationUs = endTimeUs - startTimeUs;

  const hasLoop =
    definition.startLoopTimeUs !== null && definition.endLoopTimeUs !== null;
  const loopStartUs = hasLoop
    ? clamp(definition.startLoopTimeUs!, startTimeUs, endTimeUs - 1)
    : null;
  const loopEndUs = hasLoop
    ? clamp(definition.endLoopTimeUs!, loopStartUs! + 1, endTimeUs)
    : null;
  const loopDurationUs =
    loopStartUs === null || loopEndUs === null ? 0 : loopEndUs - loopStartUs;
  const crossfadeUs = definition.loopCrossfadeDurationUs;

  return {
    ...definition,
    startTimeUs,
    endTimeUs,
    startLoopTimeUs: loopStartUs,
    endLoopTimeUs: loopEndUs,
    fadeInDurationUs: clamp(definition.fadeInDurationUs, 0, playbackDurationUs),
    fadeOutDurationUs: clamp(
      definition.fadeOutDurationUs,
      0,
      playbackDurationUs,
    ),
    loopCrossfadeDurationUs:
      crossfadeUs === null || loopDurationUs <= 1
        ? null
        : clamp(crossfadeUs, 1, loopDurationUs - 1),
  };
}
