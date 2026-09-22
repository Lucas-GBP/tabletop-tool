import { describe, expect, it } from "vitest";
import { RuntimeError } from "./RuntimeError";
import { SessionRuntime } from "./SessionRuntime";
import type {
  SceneRuntimeDefinition,
  SessionRuntimeDefinition,
} from "./SessionRuntime";

const scenes: SceneRuntimeDefinition[] = [
  { id: "scene-1", levelIds: ["level-1", "level-2"] },
  { id: "scene-2", levelIds: ["level-3"] },
];

const session: SessionRuntimeDefinition = {
  id: "session-1",
  scenes: [
    { associationId: "association-1", sceneId: "scene-1", position: 0 },
    { associationId: "association-2", sceneId: "scene-2", position: 1 },
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
    expect(runtime.snapshot.sceneRuntime.currentLevelId).toBe("level-2");
  });

  it("disposes the previous SceneRuntime when the active scene changes", () => {
    const runtime = new SessionRuntime(session, scenes);
    const previous = runtime.activeSceneRuntime;

    runtime.switchScene("scene-2");

    expect(previous.disposed).toBe(true);
    expect(runtime.activeSceneRuntime).not.toBe(previous);
    expect(runtime.snapshot.currentScene.sceneId).toBe("scene-2");
    expect(runtime.snapshot.sceneRuntime.currentLevelId).toBe("level-3");
  });

  it("keeps persistent DTO data outside its snapshot", () => {
    const runtime = new SessionRuntime(session, scenes);

    expect(runtime.snapshot.currentScene).toEqual({
      associationId: "association-1",
      sceneId: "scene-1",
      position: 0,
    });
    expect(runtime.snapshot.currentScene).not.toHaveProperty("scene");
    expect(runtime.snapshot.sceneRuntime).toEqual({
      sceneId: "scene-1",
      currentLevelId: "level-1",
      disposed: false,
    });
  });

  it("reports structured recoverable transition errors", () => {
    const runtime = new SessionRuntime(session, scenes);

    expect(() => runtime.switchScene("missing-scene")).toThrow(
      expect.objectContaining<Partial<RuntimeError>>({
        code: "SCENE_NOT_IN_SESSION",
        operation: "switch_session_scene",
        entityId: "missing-scene",
        recoverable: true,
      }),
    );
    expect(runtime.snapshot.currentScene.sceneId).toBe("scene-1");
  });

  it("discards the active SceneRuntime when the session ends", () => {
    const runtime = new SessionRuntime(session, scenes);
    const active = runtime.activeSceneRuntime;

    runtime.dispose();

    expect(active.disposed).toBe(true);
    expect(() => runtime.switchLevel("level-2")).toThrow(
      expect.objectContaining<Partial<RuntimeError>>({
        code: "SESSION_RUNTIME_DISPOSED",
        recoverable: false,
      }),
    );
  });
});
