import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { api } from "@/api";
import type { CoreSnapshotDto } from "@/api";
import { campaignSnapshot, initialScene } from "@/test/fixtures/core";

vi.mock("@/api", () => ({
  api: {
    listCore: vi.fn(),
    createScene: vi.fn(),
    createCampaign: vi.fn(),
    createSession: vi.fn(),
    createSceneLevel: vi.fn(),
    renameCampaign: vi.fn(),
    renameSession: vi.fn(),
    renameScene: vi.fn(),
    renameSceneLevel: vi.fn(),
    associateScene: vi.fn(),
    deleteCampaign: vi.fn(),
    deleteSession: vi.fn(),
    deleteScene: vi.fn(),
    deleteSceneLevel: vi.fn(),
    removeSceneFromSession: vi.fn(),
    listAudioLibrary: vi.fn(),
    getSceneAudioConfiguration: vi.fn(),
    getSceneLevelAudioConfiguration: vi.fn(),
    resolveAssetPath: vi.fn(),
    getAppSettings: vi.fn(),
    configureAssetDirectory: vi.fn(),
  },
  ApplicationError: class ApplicationError extends Error {},
  ApplicationTimeoutError: class ApplicationTimeoutError extends Error {},
}));

async function openCampaign(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", {
      name: "Abrir campanha Sombras do Norte",
    }),
  );
}

describe("Application navigation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listAudioLibrary).mockResolvedValue({
      assetDirectory: null,
      files: [],
      objects: [],
      lists: [],
      compositions: [],
      settings: { masterVolumeDb: 0 },
    });
    vi.mocked(api.getSceneAudioConfiguration).mockImplementation((sceneId) =>
      Promise.resolve({
        sceneId,
        audioObjectIds: [],
        audioListIds: [],
        audioCompositionIds: [],
      }),
    );
    vi.mocked(api.getSceneLevelAudioConfiguration).mockImplementation(
      (sceneLevelId) => Promise.resolve({ sceneLevelId, disabledLayerIds: [] }),
    );
  });

  it("runs a session separately from persistent preparation", async () => {
    const user = userEvent.setup();
    const runtimeSnapshot: CoreSnapshotDto = {
      scenes: [
        {
          ...initialScene,
          name: "Fortaleza",
          levels: [
            {
              ...initialScene.levels[0]!,
              name: "Portão",
            },
            {
              id: "level-2",
              sceneId: "scene-1",
              name: "Torre",
              position: 1,
            },
          ],
        },
        {
          id: "scene-2",
          name: "Cripta",
          levels: [
            {
              id: "level-3",
              sceneId: "scene-2",
              name: "Tumbas",
              position: 0,
            },
          ],
        },
      ],
      campaigns: [
        {
          ...campaignSnapshot.campaigns[0]!,
          sessions: [
            {
              ...campaignSnapshot.campaigns[0]!.sessions[0]!,
              scenes: [
                campaignSnapshot.campaigns[0]!.sessions[0]!.scenes[0]!,
                {
                  id: "link-2",
                  sessionId: "session-1",
                  sceneId: "scene-2",
                  position: 1,
                },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(runtimeSnapshot);
    render(<App />);
    await openCampaign(user);

    expect(screen.getByText("Modo de preparação")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Iniciar sessão Sessão 1" }),
    );

    expect(
      screen.queryByRole("heading", { name: "Sombras do Norte" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Mesa em andamento")).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Scene e SceneLevel ativos são temporários",
    );
    expect(
      screen.queryByRole("textbox", { name: "Nome da nova cena" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fortaleza" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Torre" }));
    expect(screen.getByRole("button", { name: "Torre" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: /Cripta/ }));
    expect(screen.getByRole("heading", { name: "Cripta" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tumbas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Encerrar sessão" }));
    expect(await screen.findByText("Modo de preparação")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sessões" })).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Nome da nova cena" }),
    ).not.toBeInTheDocument();
    expect(api.renameScene).not.toHaveBeenCalled();
    expect(api.renameSceneLevel).not.toHaveBeenCalled();
  });

  it("reports an invalid runtime definition without leaving the session screen", async () => {
    const user = userEvent.setup();
    const invalidSnapshot: CoreSnapshotDto = {
      ...campaignSnapshot,
      campaigns: [
        {
          ...campaignSnapshot.campaigns[0]!,
          sessions: [
            {
              ...campaignSnapshot.campaigns[0]!.sessions[0]!,
              scenes: [
                {
                  ...campaignSnapshot.campaigns[0]!.sessions[0]!.scenes[0]!,
                  sceneId: "missing-scene",
                },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(invalidSnapshot);
    render(<App />);
    await openCampaign(user);

    await user.click(
      screen.getByRole("button", { name: "Iniciar sessão Sessão 1" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Uma cena desta sessão não está disponível.",
    );
    expect(screen.getByText("Mesa em andamento")).toBeVisible();
    expect(screen.getByText("Diagnóstico da execução (1)")).toBeVisible();
    expect(screen.getByText("SESSION_SCENE_NOT_FOUND")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Encerrar sessão" }));
    expect(await screen.findByText("Modo de preparação")).toBeVisible();
  });
});
