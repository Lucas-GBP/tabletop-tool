import { useState } from "react";
import type { SceneDto } from "@/api";
import type { SceneLevelId } from "@/types";
import { classNames, formValue } from "@/lib";
import { Button, Input, Panel, SectionHeading } from "./primitives";
import { ReorderControls } from "./ReorderControls";
import styles from "./SceneLevelNavigator.module.scss";

interface SceneLevelNavigatorProps {
  scene: SceneDto;
  activeLevelId: SceneLevelId;
  disabled: boolean;
  onSelect: (levelId: SceneLevelId) => void;
  onCreate: (name: string) => Promise<boolean>;
  onMove: (levelId: SceneLevelId, position: number) => Promise<boolean>;
}

export function SceneLevelNavigator({
  scene,
  activeLevelId,
  disabled,
  onSelect,
  onCreate,
  onMove,
}: SceneLevelNavigatorProps) {
  const [draggedId, setDraggedId] = useState<SceneLevelId | null>(null);
  const levels = [...scene.levels].sort(
    (left, right) => left.position - right.position,
  );

  return (
    <Panel as="aside" className={styles.panel}>
      <SectionHeading eyebrow="Cena" title="Níveis" />
      <ol className={styles.list} aria-label={`Níveis de ${scene.name}`}>
        {levels.map((level, index) => (
          <li
            key={level.id}
            className={classNames(
              styles.item,
              level.id === activeLevelId && styles.active,
            )}
            draggable={!disabled}
            onDragStart={() => setDraggedId(level.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId && draggedId !== level.id) {
                void onMove(draggedId, level.position);
              }
              setDraggedId(null);
            }}
          >
            <button
              type="button"
              className={styles.select}
              aria-current={level.id === activeLevelId ? "true" : undefined}
              onClick={() => onSelect(level.id)}
            >
              <span>{level.position + 1}</span>
              <strong>{level.name}</strong>
            </button>
            <ReorderControls
              label={`nível ${level.name}`}
              canMoveUp={index > 0}
              canMoveDown={index < levels.length - 1}
              disabled={disabled}
              onMoveUp={() => void onMove(level.id, level.position - 1)}
              onMoveDown={() => void onMove(level.id, level.position + 1)}
            />
          </li>
        ))}
      </ol>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          void onCreate(formValue(new FormData(form), "levelName")).then(
            (created) => created && form.reset(),
          );
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
