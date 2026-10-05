import { describe, expect, it } from "vitest";
import type { AudioLibraryDto } from "@/api";
import { testId } from "@/test/ids";
import {
  audioCompositionMissing,
  audioListMissing,
  audioObjectMissing,
  sceneAudioMissing,
} from "./audioAvailability";

const library: AudioLibraryDto = {
  assetDirectory: "C:/assets",
  files: [
    {
      name: "Rain",
      originalFileName: "rain.ogg",
      relativePath: "weather/rain.ogg",
      mediaType: "audio/ogg",
      durationUs: 1_000_000,
      sizeBytes: 100,
    },
  ],
  scanWarnings: [],
  objects: [
    object("available", "weather/rain.ogg"),
    object("missing", "weather/wind.ogg"),
  ],
  lists: [
    {
      id: testId.audioList("list"),
      name: "Weather",
      selectionMode: "sequential",
      entries: [
        {
          audioObjectId: testId.audioObject("missing"),
          position: 0,
          weight: 1,
        },
      ],
    },
  ],
  compositions: [
    {
      id: testId.audioComposition("composition"),
      name: "Storm",
      layers: [
        {
          id: testId.compositionLayer("layer"),
          name: "Weather",
          position: 0,
          source: { kind: "audioList", audioListId: testId.audioList("list") },
          execution: { kind: "continuous" },
          disableBehavior: "stop",
        },
      ],
    },
  ],
  settings: { masterVolumeDb: 0 },
};

describe("audio availability", () => {
  it("propagates a missing asset through lists, compositions and scenes", () => {
    expect(audioObjectMissing(library, library.objects[0]!)).toBe(false);
    expect(audioObjectMissing(library, library.objects[1]!)).toBe(true);
    expect(audioListMissing(library, library.lists[0]!)).toBe(true);
    expect(audioCompositionMissing(library, library.compositions[0]!)).toBe(
      true,
    );
    expect(
      sceneAudioMissing(library, {
        sceneId: testId.scene("scene"),
        audioObjectIds: [],
        audioListIds: [],
        audioCompositionIds: [testId.audioComposition("composition")],
      }),
    ).toBe(true);
  });
});

function object(id: string, assetPath: string) {
  return {
    id: testId.audioObject(id),
    name: id,
    assetPath,
    volumeDb: 0,
    startTimeUs: 0,
    endTimeUs: 1_000_000,
    startLoopTimeUs: null,
    endLoopTimeUs: null,
    fadeInDurationUs: 0,
    fadeOutDurationUs: 0,
    loopCrossfadeDurationUs: null,
  };
}
