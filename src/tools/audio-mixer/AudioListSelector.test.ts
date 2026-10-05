import { describe, expect, it } from "vitest";
import type { AudioListDto } from "@/api";
import { RuntimeError } from "@/runtime";
import { testId } from "@/test/ids";
import { AudioListSelector } from "./AudioListSelector";

function list(selectionMode: AudioListDto["selectionMode"]): AudioListDto {
  return {
    id: testId.audioList("list-1"),
    name: "Passos",
    selectionMode,
    entries: [
      { audioObjectId: testId.audioObject("second"), position: 1, weight: 3 },
      { audioObjectId: testId.audioObject("first"), position: 0, weight: 1 },
    ],
  };
}

describe("AudioListSelector", () => {
  it("keeps and resets a sequential cursor in list order", () => {
    const selector = new AudioListSelector();
    const definition = list("sequential");

    expect(selector.select(definition)).toBe("first");
    expect(selector.select(definition)).toBe("second");
    expect(selector.select(definition)).toBe("first");

    selector.reset([definition.id]);
    expect(selector.select(definition)).toBe("first");
  });

  it("bounds random values and honors weighted ranges", () => {
    expect(new AudioListSelector(() => -1).select(list("random"))).toBe(
      "first",
    );
    expect(new AudioListSelector(() => 1).select(list("random"))).toBe(
      "second",
    );
    expect(
      new AudioListSelector(() => 0.1).select(list("weightedRandom")),
    ).toBe("first");
    expect(
      new AudioListSelector(() => 0.9).select(list("weightedRandom")),
    ).toBe("second");
  });

  it("reports an empty list as an isolated runtime error", () => {
    const selector = new AudioListSelector();
    const definition = { ...list("sequential"), entries: [] };

    expect(() => selector.select(definition)).toThrowError(RuntimeError);
    try {
      selector.select(definition);
    } catch (cause) {
      expect(cause).toMatchObject({
        code: "AUDIO_LIST_EMPTY",
        recoverable: true,
      });
    }
  });
});
