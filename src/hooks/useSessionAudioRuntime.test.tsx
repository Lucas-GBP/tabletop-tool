import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AudioLibraryDto,
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
  SessionDto,
} from "@/api";
import { api } from "@/api";
import { useSessionAudioRuntime } from "./useSessionAudioRuntime";

vi.mock("@/api", () => ({
  api: {
    listAudioLibrary: vi.fn(),
    getSceneAudioConfiguration: vi.fn(),
    getSceneLevelAudioConfiguration: vi.fn(),
    resolveAssetPath: vi.fn(),
  },
}));

const library: AudioLibraryDto = {
  assetDirectory: null,
  files: [],
  objects: [],
  lists: [],
  compositions: [],
  settings: { masterVolumeDb: -3 },
};
const scenes: SceneDto[] = [
  {
    id: "scene-1",
    name: "Bar",
    levels: [
      { id: "level-1", sceneId: "scene-1", name: "Térreo", position: 0 },
    ],
  },
  {
    id: "scene-2",
    name: "Rua",
    levels: [{ id: "level-2", sceneId: "scene-2", name: "Noite", position: 0 }],
  },
];
const session: SessionDto = {
  id: "session-1",
  campaignId: "campaign-1",
  name: "Sessão",
  position: 0,
  scenes: scenes.map((scene, position) => ({
    id: `link-${position}`,
    sessionId: "session-1",
    sceneId: scene.id,
    position,
  })),
};

class FakeAudioContext {
  readonly state = "running";
  readonly destination = {} as AudioDestinationNode;
  readonly currentTime = 0;

  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as GainNode;
  }

  close() {
    return Promise.resolve();
  }
}

describe("useSessionAudioRuntime", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.mocked(api.listAudioLibrary).mockResolvedValue(library);
    vi.mocked(api.getSceneAudioConfiguration).mockImplementation(
      (sceneId): Promise<SceneAudioConfigurationDto> =>
        Promise.resolve({
          sceneId,
          audioObjectIds: [],
          audioListIds: [],
          audioCompositionIds: [],
        }),
    );
    vi.mocked(api.getSceneLevelAudioConfiguration).mockImplementation(
      (sceneLevelId): Promise<SceneLevelAudioConfigurationDto> =>
        Promise.resolve({ sceneLevelId, disabledLayerIds: [] }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the session, activates audio and follows a scene change", async () => {
    const { result, rerender } = renderHook(
      ({ sceneId, levelId }) =>
        useSessionAudioRuntime(session, scenes, sceneId, levelId),
      { initialProps: { sceneId: "scene-1", levelId: "level-1" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() =>
      expect(result.current.snapshot?.sceneId).toBe("scene-1"),
    );
    await expect(result.current.activate()).resolves.toBe(true);
    await waitFor(() => expect(result.current.snapshot?.started).toBe(true));

    rerender({ sceneId: "scene-2", levelId: "level-2" });
    await waitFor(() =>
      expect(result.current.snapshot).toMatchObject({
        sceneId: "scene-2",
        currentLevelId: "level-2",
        started: true,
      }),
    );
  });

  it("reports a configuration load failure without constructing a runtime", async () => {
    vi.mocked(api.listAudioLibrary).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() =>
      useSessionAudioRuntime(session, scenes, "scene-1", "level-1"),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toMatchObject({
      code: "AUDIO_CONFIGURATION_LOAD_FAILED",
    });
  });
});
