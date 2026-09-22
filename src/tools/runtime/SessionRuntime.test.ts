import { describe, expect, it } from "vitest";
import type { SceneDto, SessionDto } from "@/api";
import { RuntimeTransitionError } from "./RuntimeTransitionError";
import { SessionRuntime } from "./SessionRuntime";

const scenes: SceneDto[] = [
  {
    id: "scene-1",
    name: "Entrada",
    levels: [
      { id: "level-1", sceneId: "scene-1", name: "Pátio", position: 0 },
      { id: "level-2", sceneId: "scene-1", name: "Torre", position: 1 },
    ],
  },
  {
    id: "scene-2",
    name: "Cripta",
    levels: [
      { id: "level-3", sceneId: "scene-2", name: "Tumbas", position: 0 },
    ],
  },
];

const session: SessionDto = {
  id: "session-1",
  campaignId: "campaign-1",
  name: "A invasão",
  position: 0,
  scenes: [
    {
      id: "association-1",
      sessionId: "session-1",
      sceneId: "scene-1",
      position: 0,
    },
    {
      id: "association-2",
      sessionId: "session-1",
      sceneId: "scene-2",
      position: 1,
    },
  ],
};

describe("SessionRuntime", () => {
  it("keeps the same SceneRuntime when the active level changes", () => {
    const runtime = new SessionRuntime(session, scenes);
    const sceneRuntime = runtime.activeSceneRuntime;

    runtime.switchLevel("level-2");
    runtime.switchScene("scene-1");

    expect(runtime.activeSceneRuntime).toBe(sceneRuntime);
    expect(sceneRuntime.disposed).toBe(false);
    expect(runtime.snapshot.sceneRuntime.currentLevel.id).toBe("level-2");
  });

  it("disposes the previous SceneRuntime when the active scene changes", () => {
    const runtime = new SessionRuntime(session, scenes);
    const previous = runtime.activeSceneRuntime;

    runtime.switchScene("scene-2");

    expect(previous.disposed).toBe(true);
    expect(runtime.activeSceneRuntime).not.toBe(previous);
    expect(runtime.snapshot.currentScene.scene.id).toBe("scene-2");
    expect(runtime.snapshot.sceneRuntime.currentLevel.id).toBe("level-3");
  });

  it("discards the active SceneRuntime when the session ends", () => {
    const runtime = new SessionRuntime(session, scenes);
    const active = runtime.activeSceneRuntime;

    runtime.dispose();

    expect(active.disposed).toBe(true);
    expect(() => runtime.switchLevel("level-2")).toThrow(
      expect.objectContaining<Partial<RuntimeTransitionError>>({
        code: "SESSION_RUNTIME_DISPOSED",
      }),
    );
  });
});
