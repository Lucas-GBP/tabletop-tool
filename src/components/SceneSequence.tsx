import { Panel, SectionHeading } from "./primitives";
import type { RuntimeScene } from "@/tools/runtime";
import styles from "./SceneSequence.module.scss";

interface SceneSequenceProps {
  scenes: RuntimeScene[];
  currentSceneId: string;
  onSelect: (sceneId: string) => void;
}

export function SceneSequence({
  scenes,
  currentSceneId,
  onSelect,
}: SceneSequenceProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Roteiro" title="Cenas da sessão" />
      <p className={styles.description}>
        Trocar de cena encerra o runtime da cena atual e inicia outro.
      </p>
      <ol className={styles.list}>
        {scenes.map((runtimeScene, index) => {
          const active = runtimeScene.scene.id === currentSceneId;
          return (
            <li key={runtimeScene.associationId}>
              <button
                type="button"
                className={styles.scene}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(runtimeScene.scene.id)}
              >
                <span className={styles.position}>{index + 1}</span>
                <span>
                  <strong>{runtimeScene.scene.name}</strong>
                  <small>{active ? "Em execução" : "Preparada"}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
