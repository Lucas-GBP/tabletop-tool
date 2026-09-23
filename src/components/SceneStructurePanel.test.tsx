import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SceneDto } from "@/api";
import { SceneStructurePanel } from "./SceneStructurePanel";

describe("SceneStructurePanel", () => {
  it("moves a scene level through the workspace callback", async () => {
    const user = userEvent.setup();
    const onMoveLevel = vi.fn().mockResolvedValue(true);
    const scene: SceneDto = {
      id: "scene-1",
      name: "Templo",
      levels: [
        { id: "level-1", sceneId: "scene-1", name: "Térreo", position: 0 },
        { id: "level-2", sceneId: "scene-1", name: "Cripta", position: 1 },
      ],
    };
    render(
      <SceneStructurePanel
        scene={scene}
        disabled={false}
        onCreateLevel={vi.fn().mockResolvedValue(true)}
        onRenameLevel={vi.fn().mockResolvedValue(true)}
        onDeleteLevel={vi.fn().mockResolvedValue(true)}
        onMoveLevel={onMoveLevel}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Mover nível Cripta para cima" }),
    );

    expect(onMoveLevel).toHaveBeenCalledWith("level-2", 0);
  });
});
