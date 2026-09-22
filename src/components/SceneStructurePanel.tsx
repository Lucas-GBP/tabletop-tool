import type { SceneDto } from "@/api";
import {
  Button,
  EditableText,
  Input,
  Panel,
  SectionHeading,
} from "./primitives";
import { formValue } from "@/lib";
import styles from "./SceneStructurePanel.module.scss";

interface SceneStructurePanelProps {
  scene: SceneDto;
  disabled: boolean;
  onCreateLevel: (name: string) => Promise<boolean>;
  onRenameLevel: (levelId: string, name: string) => Promise<boolean>;
  onDeleteLevel: (levelId: string) => Promise<boolean>;
}

export function SceneStructurePanel({
  scene,
  disabled,
  onCreateLevel,
  onRenameLevel,
  onDeleteLevel,
}: SceneStructurePanelProps) {
  return (
    <Panel as="section" className={styles.panel}>
      <SectionHeading eyebrow="Estrutura" title="Níveis da cena" />
      <ol className={styles.list} aria-label={`Níveis de ${scene.name}`}>
        {scene.levels.map((level) => (
          <li key={level.id}>
            <span className={styles.position}>{level.position + 1}</span>
            <EditableText
              className={styles.name}
              value={level.name}
              label={`nome do nível ${level.name} da cena ${scene.name}`}
              disabled={disabled}
              onSave={(name) => onRenameLevel(level.id, name)}
            />
            <Button
              tone="danger"
              className={styles.delete}
              disabled={disabled || scene.levels.length === 1}
              title={
                scene.levels.length === 1
                  ? "A cena precisa manter ao menos um nível."
                  : undefined
              }
              aria-label={`Excluir nível ${level.name}`}
              onClick={() => {
                if (!window.confirm(`Excluir o nível ${level.name}?`)) return;
                void onDeleteLevel(level.id);
              }}
            >
              Excluir
            </Button>
          </li>
        ))}
      </ol>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = formValue(new FormData(form), "levelName");
          void onCreateLevel(name).then((created) => created && form.reset());
        }}
      >
        <Input
          name="levelName"
          aria-label={`Nome do novo nível de ${scene.name}`}
          placeholder="Novo nível"
          required
        />
        <Button type="submit" disabled={disabled}>
          Adicionar nível
        </Button>
      </form>
    </Panel>
  );
}
