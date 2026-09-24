import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { SceneDto } from "@/api";
import { SceneLevelNavigator } from "./SceneLevelNavigator";

it("moves a scene level through the workspace callback", async () => {
  const user = userEvent.setup();
  const scene: SceneDto = {
    id: "scene-1",
    name: "Ruínas",
    levels: [
      { id: "level-1", sceneId: "scene-1", name: "Entrada", position: 0 },
      { id: "level-2", sceneId: "scene-1", name: "Cripta", position: 1 },
    ],
  };
  const onMove = vi.fn().mockResolvedValue(true);

  render(
    <SceneLevelNavigator
      scene={scene}
      activeLevelId="level-1"
      disabled={false}
      onSelect={vi.fn()}
      onCreate={vi.fn().mockResolvedValue(true)}
      onMove={onMove}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Mover nível Cripta para cima" }),
  );
  expect(onMove).toHaveBeenCalledWith("level-2", 0);
});
