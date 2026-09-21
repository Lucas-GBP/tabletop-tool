import type { SceneDto } from "../../../shared/api";
import { Button, EmptyState, Input, Panel, SectionHeading } from "../../../ui";
import { formValue } from "../lib/forms";
import { SceneCard } from "./SceneCard";
import styles from "./SceneLibrary.module.scss";

interface SceneLibraryProps {
  scenes: SceneDto[];
  disabled: boolean;
  onCreateScene: (name: string) => Promise<boolean>;
  onCreateLevel: (sceneId: string, name: string) => Promise<boolean>;
  onRenameScene: (sceneId: string, name: string) => Promise<boolean>;
  onRenameLevel: (levelId: string, name: string) => Promise<boolean>;
}

export function SceneLibrary({
  scenes,
  disabled,
  onCreateScene,
  onCreateLevel,
  onRenameScene,
  onRenameLevel,
}: SceneLibraryProps) {
  return (
    <Panel as="aside" id="scene-library" className={styles.panel}>
      <SectionHeading eyebrow="Biblioteca" title="Cenas reutilizáveis" />
      <p className={styles.description}>
        Prepare uma cena uma vez e adicione-a à sequência de qualquer sessão.
      </p>

      <form
        className={styles["creation-form"]}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = formValue(new FormData(form), "sceneName");
          void onCreateScene(name).then((created) => created && form.reset());
        }}
      >
        <Input
          name="sceneName"
          aria-label="Nome da nova cena"
          placeholder="Nova cena reutilizável"
          required
        />
        <Button type="submit" disabled={disabled}>
          Criar cena
        </Button>
      </form>

      {scenes.length === 0 ? (
        <EmptyState title="Comece por uma cena" className={styles.empty}>
          Campanhas e sessões usam cenas, então crie a primeira aqui.
        </EmptyState>
      ) : (
        <div className={styles["scene-list"]}>
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              disabled={disabled}
              onCreateLevel={(name) => onCreateLevel(scene.id, name)}
              onRenameScene={(name) => onRenameScene(scene.id, name)}
              onRenameLevel={onRenameLevel}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
