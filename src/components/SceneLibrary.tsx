import type { SceneDto } from "@/api";
import { Button, EmptyState, Input, Panel, SectionHeading } from "./primitives";
import { formValue } from "@/lib";
import { SceneCard } from "./SceneCard";
import styles from "./SceneLibrary.module.scss";

interface SceneLibraryProps {
  scenes: SceneDto[];
  totalSceneCount?: number;
  disabled: boolean;
  onCreateScene: (name: string) => Promise<string | undefined>;
  onOpenScene: (sceneId: string) => void;
}

export function SceneLibrary({
  scenes,
  totalSceneCount = scenes.length,
  disabled,
  onCreateScene,
  onOpenScene,
}: SceneLibraryProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Biblioteca" title="Cenas reutilizáveis" />

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
        <EmptyState
          title={
            totalSceneCount === 0 ? "Nenhuma cena" : "Nenhuma cena encontrada"
          }
          className={styles.empty}
        >
          {totalSceneCount === 0
            ? "Crie uma cena para começar."
            : "Tente buscar por outro nome."}
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
