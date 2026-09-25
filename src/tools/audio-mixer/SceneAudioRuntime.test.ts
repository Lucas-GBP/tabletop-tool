import { describe, expect, it, vi } from "vitest";
import { RuntimeError } from "@/runtime";
import { testId } from "@/test/ids";
import { AudioMixer } from "./AudioMixer";
import { SceneAudioRuntime } from "./SceneAudioRuntime";

function createRuntime() {
  const onError = vi.fn();
  const mixer = new AudioMixer({
    definitions: { files: [], objects: [], lists: [], compositions: [] },
    masterVolumeDb: 0,
    resolveFilePath: vi.fn(),
  });
  const runtime = new SceneAudioRuntime({
    definition: {
      scene: {
        sceneId: testId.scene("scene-1"),
        audioObjectIds: [],
        audioListIds: [],
        audioCompositionIds: [],
      },
      levels: [
        { sceneLevelId: testId.sceneLevel("level-1"), disabledLayerIds: [] },
        { sceneLevelId: testId.sceneLevel("level-2"), disabledLayerIds: [] },
      ],
      definitions: { files: [], objects: [], lists: [], compositions: [] },
    },
    mixer,
    onError,
  });
  return { runtime, mixer, onError };
}

describe("SceneAudioRuntime", () => {
  it("keeps its identity and runtime state while switching levels", () => {
    const { runtime } = createRuntime();

    runtime.start(testId.sceneLevel("level-1"));
    runtime.switchLevel(testId.sceneLevel("level-2"));

    expect(runtime.snapshot).toMatchObject({
      sceneId: "scene-1",
      currentLevelId: "level-2",
      started: true,
      disposed: false,
    });
  });

  it("rejects unavailable levels and cues without ending the scene", async () => {
    const { runtime, onError } = createRuntime();
    runtime.start(testId.sceneLevel("level-1"));

    expect(() =>
      runtime.switchLevel(testId.sceneLevel("missing")),
    ).toThrowError(
      expect.objectContaining({
        code: "AUDIO_LEVEL_CONFIGURATION_NOT_FOUND",
      }),
    );
    await expect(
      runtime.playCue({
        kind: "audioObject",
        id: testId.audioObject("missing"),
      }),
    ).rejects.toMatchObject({ code: "AUDIO_CUE_NOT_IN_SCENE" });
    expect(runtime.snapshot.disposed).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a missing file without stopping later cues", async () => {
    const onError = vi.fn();
    const play = vi
      .fn()
      .mockRejectedValueOnce(
        new RuntimeError({
          code: "AUDIO_FILE_NOT_FOUND",
          message: "Arquivo não encontrado.",
          operation: "play_audio_cue",
          recoverable: true,
        }),
      )
      .mockResolvedValueOnce("playback-2");
    const mixer = {
      play,
      hasPlayback: vi.fn().mockReturnValue(true),
      stop: vi.fn(),
      resetListCursors: vi.fn(),
    } as unknown as AudioMixer;
    const runtime = new SceneAudioRuntime({
      definition: {
        scene: {
          sceneId: testId.scene("scene-1"),
          audioObjectIds: [testId.audioObject("cue")],
          audioListIds: [],
          audioCompositionIds: [],
        },
        levels: [
          { sceneLevelId: testId.sceneLevel("level-1"), disabledLayerIds: [] },
        ],
        definitions: { files: [], objects: [], lists: [], compositions: [] },
      },
      mixer,
      onError,
    });
    runtime.start(testId.sceneLevel("level-1"));

    await expect(
      runtime.playCue({ kind: "audioObject", id: testId.audioObject("cue") }),
    ).rejects.toMatchObject({ code: "AUDIO_FILE_NOT_FOUND" });
    await expect(
      runtime.playCue({ kind: "audioObject", id: testId.audioObject("cue") }),
    ).resolves.toBe("playback-2");

    expect(runtime.snapshot.disposed).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("disposes once and blocks later commands", () => {
    const { runtime, mixer } = createRuntime();
    runtime.start(testId.sceneLevel("level-1"));
    runtime.dispose();
    runtime.dispose();

    expect(runtime.snapshot.disposed).toBe(true);
    expect(() =>
      runtime.switchLevel(testId.sceneLevel("level-2")),
    ).toThrowError(
      expect.objectContaining({ code: "SCENE_AUDIO_RUNTIME_DISPOSED" }),
    );
    mixer.dispose();
  });
});
