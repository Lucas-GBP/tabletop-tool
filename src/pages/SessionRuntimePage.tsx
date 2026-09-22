import type { CampaignDto, SceneDto, SessionDto } from "@/api";
import {
  ActiveScenePanel,
  RuntimeFeedback,
  SceneSequence,
  SessionRuntimeHeader,
} from "@/components";
import { useSessionRuntime } from "@/hooks";
import { RuntimeError } from "@/runtime";
import styles from "./SessionRuntimePage.module.scss";

interface SessionRuntimePageProps {
  campaign: CampaignDto;
  session: SessionDto;
  scenes: SceneDto[];
  onEnd: () => void;
}

export function SessionRuntimePage({
  campaign,
  session,
  scenes,
  onEnd,
}: SessionRuntimePageProps) {
  const runtime = useSessionRuntime(session, scenes);
  const { snapshot } = runtime;
  const sceneNames = new Map(scenes.map((scene) => [scene.id, scene.name]));
  const currentScene = snapshot
    ? scenes.find((scene) => scene.id === snapshot.currentScene.sceneId)
    : undefined;
  const unavailableSceneError =
    snapshot && !currentScene
      ? new RuntimeError({
          code: "ACTIVE_SCENE_DEFINITION_NOT_FOUND",
          message: "A definição da cena ativa não está disponível.",
          operation: "render_session_runtime",
          entityId: snapshot.currentScene.sceneId,
          details: "The active Scene identity has no matching read-only DTO.",
          recoverable: false,
        })
      : null;
  const error = runtime.error ?? unavailableSceneError;
  const diagnostics = unavailableSceneError
    ? [...runtime.diagnostics, unavailableSceneError]
    : runtime.diagnostics;
  const previousScene = snapshot?.scenes[snapshot.currentSceneIndex - 1];
  const nextScene = snapshot?.scenes[snapshot.currentSceneIndex + 1];

  return (
    <main className={styles.shell}>
      <SessionRuntimeHeader
        campaign={campaign}
        session={session}
        onEnd={() => {
          runtime.dispose();
          onEnd();
        }}
      />
      <p className={styles.notice} role="note">
        Este é o modo de execução. Scene e SceneLevel ativos são temporários e
        não alteram a preparação salva.
      </p>
      <RuntimeFeedback error={error} diagnostics={diagnostics} />
      {snapshot && currentScene && (
        <div className={styles.workspace}>
          <SceneSequence
            scenes={snapshot.scenes}
            sceneNames={sceneNames}
            currentSceneId={snapshot.currentScene.sceneId}
            onSelect={(sceneId) => runtime.switchScene(sceneId)}
          />
          <ActiveScenePanel
            scene={currentScene}
            currentLevelId={snapshot.sceneRuntime.currentLevelId}
            currentIndex={snapshot.currentSceneIndex}
            sceneCount={snapshot.scenes.length}
            onSelectLevel={(levelId) => runtime.switchLevel(levelId)}
            onPreviousScene={() =>
              previousScene && runtime.switchScene(previousScene.sceneId)
            }
            onNextScene={() =>
              nextScene && runtime.switchScene(nextScene.sceneId)
            }
          />
        </div>
      )}
    </main>
  );
}
