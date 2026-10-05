import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AudioLibraryDto,
  SceneAudioConfigurationDto,
  SceneDto,
  SceneLevelAudioConfigurationDto,
  SessionDto,
} from "@/api";
import { api } from "@/api";
import { testId } from "@/test/ids";
import { useSessionAudioRuntime } from "./useSessionAudioRuntime";

vi.mock("@/api", () => ({
  api: {
    listAudioLibrary: vi.fn(),
    getSceneAudioConfiguration: vi.fn(),
    getSceneLevelAudioConfiguration: vi.fn(),
    resolveAssetPath: vi.fn(),
    updateAudioMixerSettings: vi.fn(),
  },
}));

const library: AudioLibraryDto = {
  assetDirectory: null,
  files: [],
  scanWarnings: [],
  objects: [],
  lists: [],
  compositions: [],
  settings: { masterVolumeDb: -3 },
};
const scenes: SceneDto[] = [
  {
    id: testId.scene("scene-1"),
    name: "Bar",
    levels: [
      {
        id: testId.sceneLevel("level-1"),
        sceneId: testId.scene("scene-1"),
        name: "Térreo",
        position: 0,
      },
    ],
  },
  {
    id: testId.scene("scene-2"),
    name: "Rua",
    levels: [
      {
        id: testId.sceneLevel("level-2"),
        sceneId: testId.scene("scene-2"),
        name: "Noite",
        position: 0,
      },
    ],
  },
];
const session: SessionDto = {
  id: testId.session("session-1"),
  campaignId: testId.campaign("campaign-1"),
  name: "Sessão",
  position: 0,
  scenes: scenes.map((scene, position) => ({
    id: testId.sessionScene(`link-${position}`),
    sessionId: testId.session("session-1"),
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
    vi.mocked(api.updateAudioMixerSettings).mockImplementation(
      (masterVolumeDb) =>
        Promise.resolve({
          ...library,
          settings: { masterVolumeDb },
        }),
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
      {
        initialProps: {
          sceneId: testId.scene("scene-1"),
          levelId: testId.sceneLevel("level-1"),
        },
      },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() =>
      expect(result.current.snapshot?.sceneId).toBe("scene-1"),
    );
    await expect(result.current.activate()).resolves.toBe(true);
    await waitFor(() => expect(result.current.snapshot?.started).toBe(true));

    rerender({
      sceneId: testId.scene("scene-2"),
      levelId: testId.sceneLevel("level-2"),
    });
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
      useSessionAudioRuntime(
        session,
        scenes,
        testId.scene("scene-1"),
        testId.sceneLevel("level-1"),
      ),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toMatchObject({
      code: "AUDIO_CONFIGURATION_LOAD_FAILED",
    });
  });

  it("applies volume changes immediately and persists only the settled value", async () => {
    const { result } = renderHook(() =>
      useSessionAudioRuntime(
        session,
        scenes,
        testId.scene("scene-1"),
        testId.sceneLevel("level-1"),
      ),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    vi.useFakeTimers();

    act(() => {
      result.current.changeMasterVolume(-8);
      result.current.changeMasterVolume(-12);
    });

    expect(result.current.masterVolumeDb).toBe(-12);
    expect(result.current.persistedMasterVolumeDb).toBe(-3);
    expect(api.updateAudioMixerSettings).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(api.updateAudioMixerSettings).toHaveBeenCalledOnce();
    expect(api.updateAudioMixerSettings).toHaveBeenCalledWith(-12);
    expect(result.current.persistedMasterVolumeDb).toBe(-12);
    vi.useRealTimers();
  });
});
