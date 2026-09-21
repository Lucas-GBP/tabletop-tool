import type { SceneDto } from "../../../shared/api";
import { Button, Card, EditableText, Input } from "../../../ui";
import { formValue } from "../lib/forms";
import styles from "./SceneCard.module.scss";

interface SceneCardProps {
  scene: SceneDto;
  disabled: boolean;
  onCreateLevel: (name: string) => Promise<boolean>;
  onRenameScene: (name: string) => Promise<boolean>;
  onRenameLevel: (levelId: string, name: string) => Promise<boolean>;
}

export function SceneCard({
  scene,
  disabled,
  onCreateLevel,
  onRenameScene,
  onRenameLevel,
}: SceneCardProps) {
  return (
    <Card as="article" tone="soft" className={styles.card}>
      <div className={styles.title}>
        <EditableText
          as="h3"
          value={scene.name}
          label={`nome da cena ${scene.name}`}
          disabled={disabled}
          onSave={onRenameScene}
        />
        <span>{scene.levels.length} níveis</span>
      </div>
      <ol className={styles["level-list"]}>
        {scene.levels.map((level) => (
          <li key={level.id}>
            <EditableText
              value={level.name}
              label={`nome do nível ${level.name} da cena ${scene.name}`}
              disabled={disabled}
              onSave={(name) => onRenameLevel(level.id, name)}
            />
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
        <Button
          type="submit"
          disabled={disabled}
          aria-label={`Adicionar nível a ${scene.name}`}
        >
          +
        </Button>
      </form>
    </Card>
  );
}
