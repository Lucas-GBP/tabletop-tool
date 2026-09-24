import { Button } from "./Button";
import styles from "./ReorderControls.module.scss";

interface ReorderControlsProps {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function ReorderControls({
  label,
  canMoveUp,
  canMoveDown,
  disabled = false,
  onMoveUp,
  onMoveDown,
}: ReorderControlsProps) {
  return (
    <span className={styles.controls}>
      <span
        className={styles.handle}
        aria-hidden="true"
        title="Arraste para mover"
      >
        ⠿
      </span>
      <span className={styles.fallback}>
        <Button
          size="compact"
          tone="subtle"
          disabled={disabled || !canMoveUp}
          aria-label={`Mover ${label} para cima`}
          onClick={onMoveUp}
        >
          ↑
        </Button>
        <Button
          size="compact"
          tone="subtle"
          disabled={disabled || !canMoveDown}
          aria-label={`Mover ${label} para baixo`}
          onClick={onMoveDown}
        >
          ↓
        </Button>
      </span>
    </span>
  );
}
