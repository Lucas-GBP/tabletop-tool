import type { SceneDto } from "@/api";
import { Button, Card } from "./primitives";
import styles from "./SceneCard.module.scss";

interface SceneCardProps {
  scene: SceneDto;
  disabled: boolean;
  onOpen: () => void;
}

export function SceneCard({ scene, disabled, onOpen }: SceneCardProps) {
  const levelCount =
    scene.levels.length === 1 ? "1 nível" : `${scene.levels.length} níveis`;

  return (
    <Card as="article" tone="soft" className={styles.card}>
      <div className={styles.title}>
        <h3>{scene.name}</h3>
        <span>{levelCount}</span>
      </div>
      <Button
        className={styles.edit}
        disabled={disabled}
        aria-label={`Editar cena ${scene.name}`}
        onClick={onOpen}
      >
        Editar
      </Button>
    </Card>
  );
}
