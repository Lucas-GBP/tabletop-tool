import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { api } from "@/api";
import type { CoreSnapshotDto } from "@/api";
import { campaignSnapshot, empty, initialScene } from "@/test/fixtures/core";

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

async function openSceneFromLibrary(
  user: ReturnType<typeof userEvent.setup>,
  sceneName = "Cena inicial",
) {
  await user.click(screen.getByRole("button", { name: "Cenas" }));
  await screen.findByRole("heading", { name: "Cenas", level: 1 });
  await user.click(
    screen.getByRole("button", {
      name: `Editar cena ${sceneName}`,
    }),
  );
  await screen.findByText("Prepara\u00e7\u00e3o da cena");
}

describe("Core workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listAudioLibrary).mockResolvedValue({
      assetDirectory: null,
      files: [],
      scanWarnings: [],
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a campaign and enters its workspace", async () => {
    const user = userEvent.setup();
    vi.mocked(api.listCore).mockResolvedValue(empty);
    vi.mocked(api.createCampaign).mockResolvedValue(campaignSnapshot);
    render(<App />);

    expect(
      await screen.findByText("Crie sua primeira campanha"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar campanha" }),
    ).toBeEnabled();

    await user.type(
      screen.getByRole("textbox", { name: "Nome da nova campanha" }),
      "Sombras do Norte",
    );
    await user.click(screen.getByRole("button", { name: "Criar campanha" }));

    expect(api.createCampaign).toHaveBeenCalledExactlyOnceWith(
      "Sombras do Norte",
    );
    expect(
      await screen.findByRole("button", { name: "← Todas as campanhas" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sessão 1" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Cenas" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Campanha criada com sua sessão e cena iniciais.",
    );
  });

  it("opens an existing campaign from the campaign home", async () => {
    const user = userEvent.setup();
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Suas campanhas" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Cenas" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cenas" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Sessão 1" })).toBeNull();

    await openCampaign(user);

    expect(
      screen.getByRole("button", { name: "← Todas as campanhas" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sessão 1" })).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Sequência de cenas" }),
    ).toHaveTextContent("Cena inicial");

    await user.click(
      screen.getByRole("button", { name: "← Todas as campanhas" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Suas campanhas" }),
    ).toBeVisible();
  });

  it("renames a campaign from its preparation header", async () => {
    const user = userEvent.setup();
    const renamed: CoreSnapshotDto = {
      ...campaignSnapshot,
      campaigns: [
        {
          ...campaignSnapshot.campaigns[0]!,
          name: "Aurora Partida",
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.renameCampaign).mockResolvedValue(renamed);
    render(<App />);
    await openCampaign(user);

    await user.dblClick(
      screen.getByRole("heading", { name: "Sombras do Norte" }),
    );
    const campaignName = screen.getByRole("textbox", {
      name: "Novo nome da campanha Sombras do Norte",
    });
    await user.clear(campaignName);
    await user.type(campaignName, "Aurora Partida");
    await user.keyboard("{Enter}");

    expect(api.renameCampaign).toHaveBeenCalledExactlyOnceWith(
      "campaign-1",
      "Aurora Partida",
    );
    expect(
      await screen.findByRole("heading", { name: "Aurora Partida" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Campanha renomeada.");
  });

  it("creates and opens a reusable scene before entering a campaign", async () => {
    const user = userEvent.setup();
    const created: CoreSnapshotDto = {
      ...campaignSnapshot,
      scenes: [
        ...campaignSnapshot.scenes,
        {
          id: "scene-2",
          name: "Ruínas submersas",
          levels: [
            {
              id: "level-2",
              sceneId: "scene-2",
              name: "Nível 1",
              position: 0,
            },
          ],
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.createScene).mockResolvedValue(created);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cenas" }));
    await screen.findByRole("heading", { name: "Cenas", level: 1 });

    await user.type(
      screen.getByRole("textbox", { name: "Nome da nova cena" }),
      "Ruínas submersas",
    );
    await user.click(screen.getByRole("button", { name: "Criar cena" }));

    expect(api.createScene).toHaveBeenCalledExactlyOnceWith("Ruínas submersas");
    expect(
      await screen.findByRole("heading", { name: "Ruínas submersas" }),
    ).toBeVisible();
    expect(screen.getByText("Prepara\u00e7\u00e3o da cena")).toBeVisible();
    expect(screen.getByRole("button", { name: "← Cenas" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Configuração do nível" }),
    ).toBeVisible();
    expect(screen.getByText("Cena criada.")).toBeVisible();
  });

  it("adds another reusable scene to a session sequence", async () => {
    const user = userEvent.setup();
    const secondScene = {
      id: "scene-2",
      name: "Ruínas submersas",
      levels: [
        { id: "level-2", sceneId: "scene-2", name: "Nível 1", position: 0 },
      ],
    };
    const initial: CoreSnapshotDto = {
      ...campaignSnapshot,
      scenes: [initialScene, secondScene],
    };
    const associated: CoreSnapshotDto = {
      ...initial,
      campaigns: [
        {
          ...initial.campaigns[0]!,
          sessions: [
            {
              ...initial.campaigns[0]!.sessions[0]!,
              scenes: [
                ...initial.campaigns[0]!.sessions[0]!.scenes,
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
    vi.mocked(api.listCore).mockResolvedValue(initial);
    vi.mocked(api.associateScene).mockResolvedValue(associated);
    render(<App />);
    await openCampaign(user);

    const sessionHeading = await screen.findByRole("heading", {
      name: "Sessão 1",
    });
    const sessionCard = sessionHeading.closest("section");
    expect(sessionCard).not.toBeNull();
    const session = within(sessionCard!);
    expect(
      session.getByRole("list", { name: "Sequência de cenas" }),
    ).toHaveTextContent("Cena inicial");

    await user.selectOptions(
      session.getByRole("combobox", {
        name: "Cena para adicionar à sessão Sessão 1",
      }),
      "scene-2",
    );
    await user.click(session.getByRole("button", { name: "Adicionar cena" }));

    expect(api.associateScene).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "scene-2",
    );
    await screen.findByText("Cena adicionada à sessão.");
    const sequence = session.getByRole("list", {
      name: "Sequência de cenas",
    });
    expect(within(sequence).getAllByRole("listitem")).toHaveLength(2);
    expect(sequence).toHaveTextContent("Ruínas submersas");
  });

  it("opens a scene editor from a session sequence", async () => {
    const user = userEvent.setup();
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    render(<App />);
    await openCampaign(user);

    const sessionHeading = screen.getByRole("heading", {
      name: "Sess\u00e3o 1",
    });
    const sessionCard = sessionHeading.closest("section");
    expect(sessionCard).not.toBeNull();
    await user.click(
      within(sessionCard!).getByRole("button", { name: "Cena inicial" }),
    );

    expect(
      await screen.findByText("Prepara\u00e7\u00e3o da cena"),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "N\u00edveis" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "\u2190 Sombras do Norte" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Sess\u00f5es" }),
    ).toBeVisible();
  });

  it("renames a scene and one of its levels", async () => {
    const user = userEvent.setup();
    const initialLevel = initialScene.levels[0]!;
    const renamedScene: CoreSnapshotDto = {
      ...campaignSnapshot,
      scenes: [{ ...initialScene, name: "Templo esquecido" }],
    };
    const renamedLevel: CoreSnapshotDto = {
      ...campaignSnapshot,
      scenes: [
        {
          ...initialScene,
          name: "Templo esquecido",
          levels: [{ ...initialLevel, name: "Cripta inferior" }],
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.renameScene).mockResolvedValue(renamedScene);
    vi.mocked(api.renameSceneLevel).mockResolvedValue(renamedLevel);
    render(<App />);
    await openSceneFromLibrary(user);

    await user.dblClick(screen.getByRole("heading", { name: "Cena inicial" }));
    const sceneName = screen.getByRole("textbox", {
      name: "Novo nome da cena Cena inicial",
    });
    await user.clear(sceneName);
    await user.type(sceneName, "Templo esquecido");
    await user.keyboard("{Enter}");

    expect(api.renameScene).toHaveBeenCalledExactlyOnceWith(
      "scene-1",
      "Templo esquecido",
    );
    expect(
      await screen.findByRole("heading", { name: "Templo esquecido" }),
    ).toBeVisible();

    await user.dblClick(screen.getByRole("heading", { name: "Nível 1" }));
    const levelName = screen.getByRole("textbox", {
      name: "Novo nome do nível Nível 1 da cena Templo esquecido",
    });
    await user.clear(levelName);
    await user.type(levelName, "Cripta inferior");
    await user.keyboard("{Enter}");

    expect(api.renameSceneLevel).toHaveBeenCalledExactlyOnceWith(
      "level-1",
      "Cripta inferior",
    );
    expect(
      await screen.findByRole("heading", { name: "Cripta inferior" }),
    ).toBeVisible();
  });

  it("renames and deletes an additional session", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const secondSession = {
      id: "session-2",
      campaignId: "campaign-1",
      name: "Sessão adicional",
      position: 1,
      scenes: [
        {
          id: "link-2",
          sessionId: "session-2",
          sceneId: "scene-1",
          position: 0,
        },
      ],
    };
    const initial: CoreSnapshotDto = {
      ...campaignSnapshot,
      campaigns: [
        {
          ...campaignSnapshot.campaigns[0]!,
          sessions: [...campaignSnapshot.campaigns[0]!.sessions, secondSession],
        },
      ],
    };
    const renamed: CoreSnapshotDto = {
      ...initial,
      campaigns: [
        {
          ...initial.campaigns[0]!,
          sessions: [
            initial.campaigns[0]!.sessions[0]!,
            { ...secondSession, name: "Sessão final" },
          ],
        },
      ],
    };
    vi.mocked(api.listCore).mockResolvedValue(initial);
    vi.mocked(api.renameSession).mockResolvedValue(renamed);
    vi.mocked(api.deleteSession).mockResolvedValue(campaignSnapshot);
    render(<App />);
    await openCampaign(user);

    await user.click(
      screen.getByRole("button", { name: /^2Sessão adicional/ }),
    );
    await user.dblClick(
      screen.getByRole("heading", { name: "Sessão adicional" }),
    );
    const name = screen.getByRole("textbox", {
      name: "Novo nome da sessão Sessão adicional",
    });
    await user.clear(name);
    await user.type(name, "Sessão final");
    await user.keyboard("{Enter}");

    expect(api.renameSession).toHaveBeenCalledExactlyOnceWith(
      "session-2",
      "Sessão final",
    );
    await user.click(screen.getByLabelText("Mais ações para Sessão final"));
    await user.click(
      screen.getByRole("button", { name: "Excluir sessão Sessão final" }),
    );
    expect(api.deleteSession).toHaveBeenCalledExactlyOnceWith("session-2");
    expect(
      await screen.findByRole("heading", { name: "Sessão 1" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Sessão final" }),
    ).not.toBeInTheDocument();
  });

  it("removes a scene association and deletes a level and the reusable scene", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const secondScene = {
      id: "scene-2",
      name: "Ruínas",
      levels: [
        { id: "level-2", sceneId: "scene-2", name: "Entrada", position: 0 },
        { id: "level-3", sceneId: "scene-2", name: "Subsolo", position: 1 },
      ],
    };
    const initial: CoreSnapshotDto = {
      scenes: [initialScene, secondScene],
      campaigns: [
        {
          ...campaignSnapshot.campaigns[0]!,
          sessions: [
            {
              ...campaignSnapshot.campaigns[0]!.sessions[0]!,
              scenes: [
                ...campaignSnapshot.campaigns[0]!.sessions[0]!.scenes,
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
    const withoutAssociation: CoreSnapshotDto = {
      ...initial,
      campaigns: campaignSnapshot.campaigns,
    };
    const withoutLevel: CoreSnapshotDto = {
      ...withoutAssociation,
      scenes: [
        initialScene,
        { ...secondScene, levels: [secondScene.levels[0]!] },
      ],
    };
    const withoutScene: CoreSnapshotDto = {
      ...withoutLevel,
      scenes: [initialScene],
    };
    vi.mocked(api.listCore).mockResolvedValue(initial);
    vi.mocked(api.removeSceneFromSession).mockResolvedValue(withoutAssociation);
    vi.mocked(api.deleteSceneLevel).mockResolvedValue(withoutLevel);
    vi.mocked(api.deleteScene).mockResolvedValue(withoutScene);
    render(<App />);
    await openCampaign(user);

    await user.click(screen.getByLabelText("Mais ações para Ruínas"));
    await user.click(
      screen.getByRole("button", {
        name: "Remover cena Ruínas da sessão Sessão 1",
      }),
    );
    expect(api.removeSceneFromSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "scene-2",
    );
    await screen.findByText("Cena removida da sessão.");

    await openSceneFromLibrary(user, "Ruínas");
    await user.click(screen.getByRole("button", { name: /^2Subsolo$/ }));
    await user.click(screen.getByLabelText("Mais ações para o nível Subsolo"));
    await user.click(
      screen.getByRole("button", { name: "Excluir nível Subsolo" }),
    );
    expect(api.deleteSceneLevel).toHaveBeenCalledExactlyOnceWith("level-3");
    expect(
      await screen.findByRole("heading", { name: "Entrada" }),
    ).toBeVisible();

    await user.click(screen.getByLabelText("Mais ações para Ruínas"));
    await user.click(
      screen.getByRole("button", { name: "Excluir cena Ruínas" }),
    );
    expect(api.deleteScene).toHaveBeenCalledExactlyOnceWith("scene-2");
    expect(await screen.findByRole("heading", { name: "Cenas" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Ruínas" }),
    ).not.toBeInTheDocument();
  });

  it("deletes a campaign while preserving its reusable scenes", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.deleteCampaign).mockResolvedValue({
      campaigns: [],
      scenes: campaignSnapshot.scenes,
    });
    render(<App />);
    await openCampaign(user);

    await user.click(screen.getByLabelText("Mais ações para Sombras do Norte"));
    await user.click(
      screen.getByRole("button", {
        name: "Excluir campanha Sombras do Norte",
      }),
    );

    expect(api.deleteCampaign).toHaveBeenCalledExactlyOnceWith("campaign-1");
    expect(await screen.findByText("Crie sua primeira campanha")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cenas" }));
    expect(
      screen.getByRole("button", { name: "Editar cena Cena inicial" }),
    ).toBeVisible();
  });

  it("keeps the name editor open when a rename fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.renameScene).mockRejectedValue(new Error("write failed"));
    render(<App />);
    await openSceneFromLibrary(user);

    const sceneHeading = screen.getByRole("heading", {
      name: "Cena inicial",
    });
    await user.click(sceneHeading);
    expect(
      screen.queryByRole("textbox", {
        name: "Novo nome da cena Cena inicial",
      }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    const sceneName = screen.getByRole("textbox", {
      name: "Novo nome da cena Cena inicial",
    });
    await user.clear(sceneName);
    await user.type(sceneName, "Templo esquecido");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível acessar os dados locais. Tente novamente.",
    );
    expect(sceneName).toBeVisible();
    expect(sceneName).not.toHaveAttribute("readonly");
  });

  it("shows a useful error when local data cannot be loaded", async () => {
    vi.mocked(api.listCore).mockRejectedValue(new Error("IPC unavailable"));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível acessar os dados locais. Tente novamente.",
    );
  });
});
