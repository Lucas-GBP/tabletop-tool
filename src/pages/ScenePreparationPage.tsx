import { useState } from "react";
import type { SceneDto } from "@/api";
import {
  Button,
  SceneAudioPreparationPanel,
  SceneLevelNavigator,
  ScenePreparationHeader,
  SceneStructurePanel,
  WorkspaceFeedback,
} from "@/components";
import type { CoreWorkspace } from "@/hooks";
import styles from "./ScenePreparationPage.module.scss";

interface ScenePreparationPageProps {
  backLabel: string;
  scene: SceneDto;
  workspace: CoreWorkspace;
  onBack: () => void;
}

type SceneSection = "general" | "audio";

export function ScenePreparationPage({
  backLabel,
  scene,
  workspace,
  onBack,
}: ScenePreparationPageProps) {
  const [section, setSection] = useState<SceneSection>("general");
  const [selectedLevelId, setSelectedLevelId] = useState(
    scene.levels[0]?.id ?? "",
  );
  const selectedLevel =
    scene.levels.find((level) => level.id === selectedLevelId) ??
    scene.levels[0];
  const usageCount = workspace.snapshot.campaigns.reduce(
    (total, item) =>
      total +
      item.sessions.filter((session) =>
        session.scenes.some((association) => association.sceneId === scene.id),
      ).length,
    0,
  );

  if (!selectedLevel) return null;

  return (
    <main className={styles.shell}>
      <ScenePreparationHeader
        backLabel={backLabel}
        scene={scene}
        usageCount={usageCount}
        disabled={workspace.busy}
        onBack={onBack}
        onRename={(name) => workspace.renameScene(scene.id, name)}
        onDelete={() => workspace.deleteScene(scene.id)}
      />
      <WorkspaceFeedback error={workspace.error} />
      <div className={styles.workspace}>
        <SceneLevelNavigator
          scene={scene}
          activeLevelId={selectedLevel.id}
          disabled={workspace.busy}
          onSelect={setSelectedLevelId}
          onCreate={(name) => workspace.createSceneLevel(scene.id, name)}
          onMove={workspace.moveSceneLevel}
        />
        <section className={styles.tool}>
          <header className={styles.context}>
            <div>
              <span>Cena</span>
              <strong>{scene.name}</strong>
            </div>
            <div>
              <span>Nível</span>
              <strong>{selectedLevel.name}</strong>
            </div>
          </header>
          <nav className={styles.tabs} aria-label="Editores da cena">
            <Button
              size="compact"
              tone={section === "general" ? "primary" : "subtle"}
              aria-current={section === "general" ? "page" : undefined}
              onClick={() => setSection("general")}
            >
              Geral
            </Button>
            <Button
              size="compact"
              tone={section === "audio" ? "primary" : "subtle"}
              aria-current={section === "audio" ? "page" : undefined}
              onClick={() => setSection("audio")}
            >
              Áudio
            </Button>
          </nav>
          {section === "general" ? (
            <SceneStructurePanel
              scene={scene}
              level={selectedLevel}
              disabled={workspace.busy}
              onRenameLevel={workspace.renameSceneLevel}
              onDeleteLevel={workspace.deleteSceneLevel}
            />
          ) : (
            <SceneAudioPreparationPanel
              scene={scene}
              activeLevelId={selectedLevel.id}
            />
          )}
        </section>
      </div>
    </main>
  );
}
