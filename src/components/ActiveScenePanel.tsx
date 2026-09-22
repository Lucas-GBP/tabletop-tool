import { Button, EmptyState, Panel, SectionHeading } from "./primitives";
import type { RuntimeScene } from "@/tools/runtime";
import styles from "./ActiveScenePanel.module.scss";

interface ActiveScenePanelProps {
  runtimeScene: RuntimeScene;
  currentLevelId: string;
  currentIndex: number;
  sceneCount: number;
  onSelectLevel: (levelId: string) => void;
  onPreviousScene: () => void;
  onNextScene: () => void;
}

export function ActiveScenePanel({
  runtimeScene,
  currentLevelId,
  currentIndex,
  sceneCount,
  onSelectLevel,
  onPreviousScene,
  onNextScene,
}: ActiveScenePanelProps) {
  const { scene } = runtimeScene;

  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading
        eyebrow={`Cena ${currentIndex + 1} de ${sceneCount}`}
        title={scene.name}
      />

      <section className={styles.levels} aria-labelledby="active-level-heading">
        <div>
          <h3 id="active-level-heading">Nível ativo</h3>
          <p>
            Trocar de nível mantém o runtime e os estados temporários desta
            cena.
          </p>
        </div>
        <div className={styles["level-list"]}>
          {[...scene.levels]
            .sort((left, right) => left.position - right.position)
            .map((level) => (
              <Button
                key={level.id}
                className={styles.level}
                aria-pressed={level.id === currentLevelId}
                onClick={() => onSelectLevel(level.id)}
              >
                {level.name}
              </Button>
            ))}
        </div>
      </section>

      <section className={styles.tools} aria-labelledby="scene-tools-heading">
        <h3 id="scene-tools-heading">Ferramentas da cena</h3>
        <EmptyState title="Nenhuma ferramenta configurada">
          Quando Audio Mixer, encontros e outras ferramentas forem configurados,
          seus controles de execução aparecerão aqui.
        </EmptyState>
      </section>

      <footer className={styles.navigation}>
        <Button onClick={onPreviousScene} disabled={currentIndex === 0}>
          ← Cena anterior
        </Button>
        <span>
          O estado temporário é descartado ao sair de{" "}
          <strong>{scene.name}</strong>.
        </span>
        <Button
          onClick={onNextScene}
          disabled={currentIndex === sceneCount - 1}
        >
          Próxima cena →
        </Button>
      </footer>
    </Panel>
  );
}
