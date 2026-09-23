import type { ReactNode } from "react";
import type { SceneDto } from "@/api";
import { Button, Panel, SectionHeading } from "./primitives";
import styles from "./ActiveScenePanel.module.scss";

interface ActiveScenePanelProps {
  scene: SceneDto;
  currentLevelId: string;
  currentIndex: number;
  sceneCount: number;
  onSelectLevel: (levelId: string) => void;
  onPreviousScene: () => void;
  onNextScene: () => void;
  tools: ReactNode;
}

export function ActiveScenePanel({
  scene,
  currentLevelId,
  currentIndex,
  sceneCount,
  onSelectLevel,
  onPreviousScene,
  onNextScene,
  tools,
}: ActiveScenePanelProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading
        eyebrow={`Cena ${currentIndex + 1} de ${sceneCount}`}
        title={scene.name}
      />

      <section className={styles.levels} aria-labelledby="active-level-heading">
        <h3 id="active-level-heading">Nível ativo</h3>
        <div className={styles["level-list"]}>
          {[...scene.levels]
            .sort((left, right) => left.position - right.position)
            .map((level) => (
              <Button
                key={level.id}
                className={styles.level}
                size="compact"
                aria-pressed={level.id === currentLevelId}
                onClick={() => onSelectLevel(level.id)}
              >
                {level.name}
              </Button>
            ))}
        </div>
      </section>

      <section className={styles.tools} aria-labelledby="scene-tools-heading">
        <h3 id="scene-tools-heading">Áudio da cena</h3>
        {tools}
      </section>

      <footer className={styles.navigation}>
        <Button
          size="compact"
          onClick={onPreviousScene}
          disabled={currentIndex === 0}
        >
          ← Cena anterior
        </Button>
        <Button
          size="compact"
          onClick={onNextScene}
          disabled={currentIndex === sceneCount - 1}
        >
          Próxima cena →
        </Button>
      </footer>
    </Panel>
  );
}
