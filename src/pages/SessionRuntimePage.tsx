import type { CampaignDto, SceneDto, SessionDto } from "@/api";
import {
  ActiveScenePanel,
  SceneSequence,
  SessionRuntimeHeader,
} from "@/components";
import { useSessionRuntime } from "@/hooks";
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
  const previousScene = snapshot.scenes[snapshot.currentSceneIndex - 1];
  const nextScene = snapshot.scenes[snapshot.currentSceneIndex + 1];

  return (
    <main className={styles.shell}>
      <SessionRuntimeHeader
        campaign={campaign}
        session={session}
        onEnd={onEnd}
      />
      <p className={styles.notice} role="note">
        Este é o modo de execução. Scene e SceneLevel ativos são temporários e
        não alteram a preparação salva.
      </p>
      <div className={styles.workspace}>
        <SceneSequence
          scenes={snapshot.scenes}
          currentSceneId={snapshot.currentScene.scene.id}
          onSelect={(sceneId) => runtime.switchScene(sceneId)}
        />
        <ActiveScenePanel
          runtimeScene={snapshot.currentScene}
          currentLevelId={snapshot.sceneRuntime.currentLevel.id}
          currentIndex={snapshot.currentSceneIndex}
          sceneCount={snapshot.scenes.length}
          onSelectLevel={(levelId) => runtime.switchLevel(levelId)}
          onPreviousScene={() =>
            previousScene && runtime.switchScene(previousScene.scene.id)
          }
          onNextScene={() =>
            nextScene && runtime.switchScene(nextScene.scene.id)
          }
        />
      </div>
    </main>
  );
}
