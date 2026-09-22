import { useEffect, useState } from "react";
import type { SceneDto, SessionDto } from "@/api";
import { normalizeRuntimeError, RuntimeError, SessionRuntime } from "@/runtime";
import type { SessionRuntimeSnapshot } from "@/runtime";

interface RuntimeInitialization {
  runtime: SessionRuntime | null;
  snapshot: SessionRuntimeSnapshot | null;
  error: RuntimeError | null;
}

function initializeRuntime(
  session: SessionDto,
  scenes: SceneDto[],
): RuntimeInitialization {
  try {
    const runtime = new SessionRuntime(
      {
        id: session.id,
        scenes: session.scenes.map((association) => ({
          associationId: association.id,
          position: association.position,
          sceneId: association.sceneId,
        })),
      },
      scenes.map((scene) => ({
        id: scene.id,
        levelIds: [...scene.levels]
          .sort((left, right) => left.position - right.position)
          .map((level) => level.id),
      })),
    );
    return { runtime, snapshot: runtime.snapshot, error: null };
  } catch (cause) {
    return {
      runtime: null,
      snapshot: null,
      error: normalizeRuntimeError(cause, {
        code: "SESSION_RUNTIME_START_FAILED",
        message: "Não foi possível iniciar a execução da sessão.",
        operation: "start_session",
        entityId: session.id,
        recoverable: false,
      }),
    };
  }
}

export function useSessionRuntime(session: SessionDto, scenes: SceneDto[]) {
  const [initialization] = useState(() => initializeRuntime(session, scenes));
  const runtime = initialization.runtime;
  const [snapshot, setSnapshot] = useState(initialization.snapshot);
  const [error, setError] = useState(initialization.error);
  const [diagnostics, setDiagnostics] = useState<RuntimeError[]>(() =>
    initialization.error ? [initialization.error] : [],
  );

  useEffect(
    () => () => {
      runtime?.dispose();
    },
    [runtime],
  );

  function report(cause: unknown, operation: string, entityId: string) {
    const runtimeError = normalizeRuntimeError(cause, {
      code: "RUNTIME_OPERATION_FAILED",
      message: "A operação de execução falhou.",
      operation,
      entityId,
      recoverable: true,
    });
    setError(runtimeError);
    setDiagnostics((current) => [...current.slice(-19), runtimeError]);
  }

  function execute(
    operation: string,
    entityId: string,
    action: (activeRuntime: SessionRuntime) => void,
  ) {
    if (!runtime) return false;
    try {
      action(runtime);
      setSnapshot(runtime.snapshot);
      setError(null);
      return true;
    } catch (cause) {
      report(cause, operation, entityId);
      return false;
    }
  }

  return {
    snapshot,
    error,
    diagnostics,
    dispose() {
      if (!runtime) return;
      try {
        runtime.dispose();
      } catch (cause) {
        report(cause, "dispose_session", session.id);
      }
    },
    switchScene: (sceneId: string) =>
      execute("switch_session_scene", sceneId, (activeRuntime) =>
        activeRuntime.switchScene(sceneId),
      ),
    switchLevel: (levelId: string) =>
      execute("switch_scene_level", levelId, (activeRuntime) =>
        activeRuntime.switchLevel(levelId),
      ),
  };
}
