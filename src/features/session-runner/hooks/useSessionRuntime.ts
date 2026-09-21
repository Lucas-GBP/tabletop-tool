import { useEffect, useState } from "react";
import type { SceneDto, SessionDto } from "../../../shared/api";
import { SessionRuntime } from "../runtime/SessionRuntime";

export function useSessionRuntime(session: SessionDto, scenes: SceneDto[]) {
  const [runtime] = useState(() => new SessionRuntime(session, scenes));
  const [snapshot, setSnapshot] = useState(() => runtime.snapshot);

  useEffect(
    () => () => {
      runtime.dispose();
    },
    [runtime],
  );

  return {
    snapshot,
    switchScene(sceneId: string) {
      runtime.switchScene(sceneId);
      setSnapshot(runtime.snapshot);
    },
    switchLevel(levelId: string) {
      runtime.switchLevel(levelId);
      setSnapshot(runtime.snapshot);
    },
  };
}
