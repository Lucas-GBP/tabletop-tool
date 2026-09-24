import type { ReactNode } from "react";
import styles from "./ActionMenu.module.scss";

interface ActionMenuProps {
  label?: string;
  children: ReactNode;
}

export function ActionMenu({
  label = "Mais ações",
  children,
}: ActionMenuProps) {
  return (
    <details className={styles.menu}>
      <summary aria-label={label} title={label}>
        ⋯
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
