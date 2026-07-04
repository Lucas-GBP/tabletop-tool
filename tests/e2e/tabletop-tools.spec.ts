import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { installTauriMock, readMockStores } from "./tauriMock";

async function openTool(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label }).click();
}

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
});

test("cria dados em todas as tools e resolve a hierarquia no modo mesa", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mesa" })).toBeVisible();
  await expect(page.getByText("Crie uma sessao no planejador")).toBeVisible();

  await openTool(page, /Iniciativa/);
  await page.getByRole("button", { name: "+ Encontro" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Encontro da ponte");
  await page.getByRole("button", { name: "+ Participante" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Capitao bandido");
  await page.getByLabel("Papel").selectOption("npc");
  await page.getByLabel("Mod. iniciativa").fill("3");
  await page.getByRole("spinbutton", { name: "CA" }).fill("14");
  await page.getByRole("spinbutton", { name: "PV" }).fill("22");
  await expect(page.getByText("Capitao bandido")).toBeVisible();

  await openTool(page, /Mixer de audio/);
  await expect(page.getByRole("heading", { name: "Mixer de audio" }).first()).toBeVisible();
  await page.getByRole("button", { name: "+ Objeto" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /Chuva de teste/ }).click();

  const objectRegion = page.getByRole("region", { name: "Objetos de audio" });

  await objectRegion.getByLabel("Nome", { exact: true }).fill("Objeto chuva");
  await objectRegion.getByLabel("Tags").fill("chuva, ponte");
  await objectRegion.getByLabel("Descricao").fill("Ambiencia principal da ponte.");
  await objectRegion.getByRole("button", { name: "Ouvir" }).click();
  await expect(objectRegion.getByRole("button", { name: "Parar" })).toBeVisible();
  await objectRegion.getByRole("button", { name: "Parar" }).click();

  const listRegion = page.getByRole("region", { name: "Listas de objetos de audio" });

  await listRegion.getByRole("button", { name: "+ Lista" }).click();
  await listRegion.getByLabel("Nome", { exact: true }).fill("Lista ambiente");
  await listRegion.getByLabel("Adicionar objeto").selectOption({ label: "Objeto chuva" });
  await expect(listRegion.getByText("Objeto chuva")).toBeVisible();
  await listRegion.getByRole("button", { name: "Sortear" }).click();
  await expect(listRegion.getByRole("button", { name: "Parar" })).toBeVisible();
  await listRegion.getByRole("button", { name: "Parar" }).click();
  await page.waitForFunction(
    () =>
      window.__tabletopTestStores.audioMixer.audioObjects.length === 1 &&
      window.__tabletopTestStores.audioMixer.audioObjectLists.length === 1
  );

  await openTool(page, /Audio de cena/);
  await page.getByRole("button", { name: "+ Composicao" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Som da ponte");
  await page.getByRole("button", { name: "+ Faixa" }).click();
  await expect(page.locator("strong").filter({ hasText: "Objeto chuva" })).toBeVisible();
  await page.getByLabel("Rotulo do trigger").fill("Chuva sobe");
  await page.getByRole("button", { name: "Testar" }).click();
  await expect(page.getByRole("button", { name: "Parar" })).toBeVisible();
  await page.getByRole("button", { name: "Parar" }).click();
  await page.waitForFunction(
    () => window.__tabletopTestStores.audioComposition.audioCompositions[0]?.tracks.length === 1
  );

  await openTool(page, /Cenas/);
  await page.getByRole("button", { name: "+ Cena" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Cena da ponte");
  await page.getByLabel("Descricao").fill("Travessia sob chuva.");
  await page
    .getByLabel("Notas de preparacao")
    .fill("Usar o encontro quando os personagens cruzarem metade da ponte.");
  await page.getByLabel("Composicao de audio").selectOption({ label: "Som da ponte" });
  await page.getByLabel("Encontro de iniciativa").selectOption({ label: "Encontro da ponte" });
  await expect(page.getByText(/Som da ponte \/ Encontro da ponte/)).toBeVisible();
  await page.waitForFunction(
    () =>
      window.__tabletopTestStores.scene.scenes[0]?.audioCompositionId &&
      window.__tabletopTestStores.scene.scenes[0]?.initiativeEncounterId
  );

  await openTool(page, /Sessoes/);
  await page.getByRole("button", { name: "+ Sessao" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Sessao 01");
  await page.getByLabel("Descricao").fill("Noite da ponte");
  await page.getByLabel("Notas", { exact: true }).fill("Abrir direto na cena da ponte.");
  await page.getByLabel("Adicionar cena").selectOption({ label: "Cena da ponte" });
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Cena da ponte")).toBeVisible();
  await page.waitForFunction(
    () => window.__tabletopTestStores.session.sessions[0]?.sceneIds.length === 1
  );

  await openTool(page, /^Mesa/);
  await page.getByRole("button", { name: "Atualizar" }).click();
  await expect(page.getByRole("heading", { name: "Sessao 01" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cena da ponte" })).toBeVisible();
  await expect(page.getByText("Som da ponte").first()).toBeVisible();
  await expect(page.getByText("Encontro da ponte").first()).toBeVisible();
  await expect(page.getByText("Capitao bandido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tocar" })).toBeVisible();

  const stores = await readMockStores(page);
  const audioObject = stores.audioMixer.audioObjects[0];
  const audioList = stores.audioMixer.audioObjectLists[0];
  const composition = stores.audioComposition.audioCompositions[0];
  const track = composition?.tracks[0];
  const encounter = stores.initiative.encounters[0];
  const scene = stores.scene.scenes[0];
  const session = stores.session.sessions[0];

  expect(audioObject?.name).toBe("Objeto chuva");
  expect(audioObject?.tags).toEqual(["chuva", "ponte"]);
  expect(audioList?.audioObjectIds).toEqual([audioObject?.id]);
  expect(composition?.name).toBe("Som da ponte");
  expect(track?.sourceKind).toBe("audioObject");
  expect(track?.sourceId).toBe(audioObject?.id);
  expect(track?.triggerLabel).toBe("Chuva sobe");
  expect(encounter?.participants[0]?.name).toBe("Capitao bandido");
  expect(scene?.audioCompositionId).toBe(composition?.id);
  expect(scene?.initiativeEncounterId).toBe(encounter?.id);
  expect(session?.sceneIds).toEqual([scene?.id]);
  expect(session?.activeSceneId).toBe(scene?.id);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("filtra entidades no workspace compartilhado", async ({ page }) => {
  await page.goto("/");

  await openTool(page, /Cenas/);
  await page.getByRole("button", { name: "+ Cena" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Cena do porto");
  await page.getByRole("button", { name: "+ Cena" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Cena da biblioteca");

  await page.getByPlaceholder("Buscar").fill("porto");

  await expect(page.getByRole("button", { name: /Cena do porto/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cena da biblioteca/ })).toHaveCount(0);
});
