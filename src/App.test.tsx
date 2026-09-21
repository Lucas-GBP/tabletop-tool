import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./shared/api";
import type { CoreSnapshotDto } from "./shared/api";

vi.mock("./shared/api", () => ({
  api: {
    listCore: vi.fn(),
    createScene: vi.fn(),
    createCampaign: vi.fn(),
    createSession: vi.fn(),
    createSceneLevel: vi.fn(),
    renameCampaign: vi.fn(),
    renameScene: vi.fn(),
    renameSceneLevel: vi.fn(),
    associateScene: vi.fn(),
  },
  ApplicationError: class ApplicationError extends Error {},
  ApplicationTimeoutError: class ApplicationTimeoutError extends Error {},
}));

const empty: CoreSnapshotDto = { campaigns: [], scenes: [] };

const initialScene: CoreSnapshotDto["scenes"][number] = {
  id: "scene-1",
  name: "Cena inicial",
  levels: [{ id: "level-1", sceneId: "scene-1", name: "Nível 1", position: 0 }],
};

const campaignSnapshot: CoreSnapshotDto = {
  scenes: [initialScene],
  campaigns: [
    {
      id: "campaign-1",
      name: "Sombras do Norte",
      sessions: [
        {
          id: "session-1",
          campaignId: "campaign-1",
          name: "Sessão 1",
          position: 0,
          scenes: [
            {
              id: "link-1",
              sessionId: "session-1",
              sceneId: "scene-1",
              position: 0,
            },
          ],
        },
      ],
    },
  ],
};

async function openCampaign(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", {
      name: "Abrir campanha Sombras do Norte",
    }),
  );
}

describe("Core workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    expect(
      screen.getByRole("heading", { name: "Cenas reutilizáveis" }),
    ).toBeVisible();
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
    expect(screen.queryByRole("heading", { name: "Sessão 1" })).toBeNull();

    await openCampaign(user);

    expect(
      screen.getByRole("button", { name: "← Todas as campanhas" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sessão 1" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cena inicial" })).toBeVisible();

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
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.renameCampaign).toHaveBeenCalledExactlyOnceWith(
      "campaign-1",
      "Aurora Partida",
    );
    expect(
      await screen.findByRole("heading", { name: "Aurora Partida" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Campanha renomeada.");
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
    expect(
      screen.getByRole("textbox", { name: "Nome da nova cena" }),
    ).toBeVisible();
    expect(api.renameScene).not.toHaveBeenCalled();
    expect(api.renameSceneLevel).not.toHaveBeenCalled();
  });

  it("creates a reusable scene from inside a campaign", async () => {
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
    await openCampaign(user);

    await user.type(
      screen.getByRole("textbox", { name: "Nome da nova cena" }),
      "Ruínas submersas",
    );
    await user.click(screen.getByRole("button", { name: "Criar cena" }));

    expect(api.createScene).toHaveBeenCalledExactlyOnceWith("Ruínas submersas");
    expect(
      await screen.findByRole("heading", { name: "Ruínas submersas" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Cena criada.");
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
        name: "Cena da biblioteca para adicionar à sessão Sessão 1",
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
    await openCampaign(user);

    await screen.findByRole("heading", { name: "Cena inicial" });
    await user.dblClick(screen.getByRole("heading", { name: "Cena inicial" }));
    const sceneName = screen.getByRole("textbox", {
      name: "Novo nome da cena Cena inicial",
    });
    await user.clear(sceneName);
    await user.type(sceneName, "Templo esquecido");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.renameScene).toHaveBeenCalledExactlyOnceWith(
      "scene-1",
      "Templo esquecido",
    );
    expect(
      await screen.findByRole("heading", { name: "Templo esquecido" }),
    ).toBeVisible();

    await user.dblClick(screen.getByText("Nível 1"));
    const levelName = screen.getByRole("textbox", {
      name: "Novo nome do nível Nível 1 da cena Templo esquecido",
    });
    await user.clear(levelName);
    await user.type(levelName, "Cripta inferior");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.renameSceneLevel).toHaveBeenCalledExactlyOnceWith(
      "level-1",
      "Cripta inferior",
    );
    expect(await screen.findByText("Cripta inferior")).toBeVisible();
  });

  it("keeps the name editor open when a rename fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.listCore).mockResolvedValue(campaignSnapshot);
    vi.mocked(api.renameScene).mockRejectedValue(new Error("write failed"));
    render(<App />);
    await openCampaign(user);

    await screen.findByRole("heading", { name: "Cena inicial" });
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
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível acessar os dados locais. Tente novamente.",
    );
    expect(sceneName).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("shows a useful error when local data cannot be loaded", async () => {
    vi.mocked(api.listCore).mockRejectedValue(new Error("IPC unavailable"));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível acessar os dados locais. Tente novamente.",
    );
  });
});
