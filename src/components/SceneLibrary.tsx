import type { SceneDto } from "@/api";
import { Button, EmptyState, Input, Panel, SectionHeading } from "./primitives";
import { formValue } from "@/lib";
import { SceneCard } from "./SceneCard";
import styles from "./SceneLibrary.module.scss";

interface SceneLibraryProps {
  scenes: SceneDto[];
  disabled: boolean;
  onCreateScene: (name: string) => Promise<string | undefined>;
  onOpenScene: (sceneId: string) => void;
}

export function SceneLibrary({
  scenes,
  disabled,
  onCreateScene,
  onOpenScene,
}: SceneLibraryProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading title="Cenas" />

      <form
        className={styles["creation-form"]}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = formValue(new FormData(form), "sceneName");
          void onCreateScene(name).then((sceneId) => {
            if (!sceneId) return;
            form.reset();
            onOpenScene(sceneId);
          });
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
        <EmptyState title="Nenhuma cena" className={styles.empty}>
          Crie uma cena para começar.
        </EmptyState>
      ) : (
        <div className={styles["scene-list"]}>
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              disabled={disabled}
              onOpen={() => onOpenScene(scene.id)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
