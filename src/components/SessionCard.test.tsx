import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SceneDto, SessionDto } from "@/api";
import { SessionCard } from "./SessionCard";

const session: SessionDto = {
  id: "session-1",
  campaignId: "campaign-1",
  name: "Noite",
  position: 1,
  scenes: [
    { id: "link-1", sessionId: "session-1", sceneId: "scene-1", position: 0 },
    { id: "link-2", sessionId: "session-1", sceneId: "scene-2", position: 1 },
  ],
};

const scenes: SceneDto[] = [
  { id: "scene-1", name: "Bar", levels: [] },
  { id: "scene-2", name: "Rua", levels: [] },
];

describe("SessionCard", () => {
  it("exposes simple controls for session and scene ordering", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(true);
    const onMoveScene = vi.fn().mockResolvedValue(true);
    render(
      <SessionCard
        session={session}
        scenes={scenes}
        sceneNames={new Map(scenes.map((scene) => [scene.id, scene.name]))}
        disabled={false}
        canDelete
        canMoveUp
        canMoveDown={false}
        onManageScenes={vi.fn()}
        onOpenScene={vi.fn()}
        onStart={vi.fn()}
        onRename={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn().mockResolvedValue(true)}
        onMove={onMove}
        onAssociate={vi.fn().mockResolvedValue(true)}
        onMoveScene={onMoveScene}
        onRemoveScene={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Mover sessão Noite para cima" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Mover cena Rua para cima" }),
    );

    expect(onMove).toHaveBeenCalledWith(0);
    expect(onMoveScene).toHaveBeenCalledWith("scene-2", 0);
  });
});
