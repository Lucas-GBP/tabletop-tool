import { useEffect, useState } from "react";
import type { SceneDto, SessionDto } from "@/api";
import { SessionRuntime } from "@/tools/runtime";

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
