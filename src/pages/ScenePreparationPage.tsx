import type { SceneDto } from "@/api";
import {
  EmptyState,
  Panel,
  ScenePreparationHeader,
  SceneStructurePanel,
  SectionHeading,
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

export function ScenePreparationPage({
  backLabel,
  scene,
  workspace,
  onBack,
}: ScenePreparationPageProps) {
  const usageCount = workspace.snapshot.campaigns.reduce(
    (total, item) =>
      total +
      item.sessions.filter((session) =>
        session.scenes.some((association) => association.sceneId === scene.id),
      ).length,
    0,
  );

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
      <WorkspaceFeedback error={workspace.error} notice={workspace.notice} />
      <div className={styles.workspace}>
        <SceneStructurePanel
          scene={scene}
          disabled={workspace.busy}
          onCreateLevel={(name) => workspace.createSceneLevel(scene.id, name)}
          onRenameLevel={workspace.renameSceneLevel}
          onDeleteLevel={workspace.deleteSceneLevel}
        />
        <Panel as="section" className={styles.tools}>
          <SectionHeading eyebrow="Configuração" title="Ferramentas" />
          <EmptyState title="Nenhuma ferramenta configurada">
            Áudio, encontros e outras ferramentas desta cena aparecerão aqui.
          </EmptyState>
        </Panel>
      </div>
    </main>
  );
}
