import type { SceneDto } from "@/api";
import { Button, EditableText } from "./primitives";
import styles from "./ScenePreparationHeader.module.scss";

interface ScenePreparationHeaderProps {
  backLabel: string;
  scene: SceneDto;
  usageCount: number;
  disabled: boolean;
  onBack: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

export function ScenePreparationHeader({
  backLabel,
  scene,
  usageCount,
  disabled,
  onBack,
  onRename,
  onDelete,
}: ScenePreparationHeaderProps) {
  const levelLabel = scene.levels.length === 1 ? "nível" : "níveis";
  const usageLabel = usageCount === 1 ? "sessão usando" : "sessões usando";

  return (
    <header className={styles.header}>
      <div className={styles.navigation}>
        <Button className={styles.back} onClick={onBack}>
          ← {backLabel}
        </Button>
        <div className={styles["navigation-actions"]}>
          <span className={styles.mode}>Preparação da cena</span>
          <Button
            tone="danger"
            disabled={disabled}
            aria-label={`Excluir cena ${scene.name}`}
            onClick={() => {
              if (
                !window.confirm(
                  `Excluir a cena ${scene.name}? Seus níveis e associações serão removidos.`,
                )
              ) {
                return;
              }
              void onDelete().then((deleted) => deleted && onBack());
            }}
          >
            Excluir cena
          </Button>
        </div>
      </div>
      <div className={styles.content}>
        <div>
          <p className={styles.eyebrow}>Cena reutilizável</p>
          <EditableText
            as="h1"
            value={scene.name}
            label={`nome da cena ${scene.name}`}
            disabled={disabled}
            onSave={onRename}
          />
          <p className={styles.subtitle}>
            Configure os níveis e as ferramentas desta cena.
          </p>
        </div>
        <div className={styles.summary} aria-label="Resumo da cena">
          <strong>{scene.levels.length}</strong>
          <span>{levelLabel}</span>
          <strong>{usageCount}</strong>
          <span>{usageLabel}</span>
        </div>
      </div>
    </header>
  );
}
