import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioLibraryDto, SceneDto } from "@/api";
import { useSceneAudioConfiguration } from "@/hooks/useSceneAudioConfiguration";
import { SceneAudioPreparationPanel } from "./SceneAudioPreparationPanel";

vi.mock("@/hooks/useSceneAudioConfiguration", () => ({
  useSceneAudioConfiguration: vi.fn(),
}));

const saveScene = vi.fn();
const scene: SceneDto = {
  id: "scene-1",
  name: "Forest",
  levels: [
    {
      id: "level-1",
      sceneId: "scene-1",
      name: "Ground",
      position: 0,
    },
  ],
};
const library: AudioLibraryDto = {
  assetDirectory: "C:/assets",
  files: [],
  objects: [
    {
      id: "object-1",
      name: "Rain",
      assetPath: "rain.ogg",
      volumeDb: 0,
      startTimeUs: 0,
      endTimeUs: 1_000_000,
      startLoopTimeUs: null,
      endLoopTimeUs: null,
      fadeInDurationUs: 0,
      fadeOutDurationUs: 0,
      loopCrossfadeDurationUs: null,
    },
  ],
  lists: [],
  compositions: [
    {
      id: "composition-1",
      name: "Storm",
      layers: [
        {
          id: "layer-1",
          name: "Rain bed",
          position: 0,
          source: { kind: "audioObject", audioObjectId: "object-1" },
          execution: { kind: "continuous" },
          disableBehavior: "stop",
        },
      ],
    },
  ],
  settings: { masterVolumeDb: 0 },
};

describe("SceneAudioPreparationPanel", () => {
  beforeEach(() => {
    saveScene.mockReset().mockResolvedValue(true);
    vi.mocked(useSceneAudioConfiguration).mockReturnValue({
      library,
      scene: {
        sceneId: scene.id,
        audioObjectIds: [],
        audioListIds: [],
        audioCompositionIds: [],
      },
      levels: [{ sceneLevelId: "level-1", disabledLayerIds: [] }],
      loading: false,
      loaded: true,
      loadError: "",
      reload: vi.fn(),
      busy: false,
      error: "",
      saveScene,
      saveLevel: vi.fn(),
    });
  });

  it("saves selected objects and compositions before exposing level controls", async () => {
    const user = userEvent.setup();
    render(<SceneAudioPreparationPanel scene={scene} />);

    await user.click(screen.getByRole("checkbox", { name: "Rain" }));
    await user.click(screen.getByRole("checkbox", { name: "Storm" }));

    expect(
      screen.getByText(
        "Salve os recursos para configurar as camadas por nível.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Salvar nível" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Salvar recursos da cena" }),
    );

    await waitFor(() =>
      expect(saveScene).toHaveBeenCalledWith({
        sceneId: "scene-1",
        audioObjectIds: ["object-1"],
        audioListIds: [],
        audioCompositionIds: ["composition-1"],
      }),
    );
  });
});
