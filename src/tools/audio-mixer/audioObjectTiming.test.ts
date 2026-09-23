import { describe, expect, it } from "vitest";
import type { AudioObjectInputDto } from "@/api";
import {
  audioBufferDurationUs,
  fitAudioObjectToDuration,
} from "./audioObjectTiming";

const definition: AudioObjectInputDto = {
  name: "Chuva",
  assetPath: "audio/chuva.mp3",
  volumeDb: 0,
  startTimeUs: 0,
  endTimeUs: 1_010_000,
  startLoopTimeUs: 800_000,
  endLoopTimeUs: 1_010_000,
  fadeInDurationUs: 0,
  fadeOutDurationUs: 20_000,
  loopCrossfadeDurationUs: 50_000,
};

describe("audio object timing", () => {
  it("rounds a decoded buffer duration down to a safe microsecond", () => {
    expect(audioBufferDurationUs({ duration: 1.000_000_9 })).toBe(1_000_000);
  });

  it("fits playback and loop regions inside the decoded audio", () => {
    expect(fitAudioObjectToDuration(definition, 1_000_000)).toEqual({
      ...definition,
      endTimeUs: 1_000_000,
      endLoopTimeUs: 1_000_000,
    });
  });
});
