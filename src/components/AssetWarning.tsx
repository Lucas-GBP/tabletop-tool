import type { PropsWithChildren } from "react";
import styles from "./AssetWarning.module.scss";

export function AssetWarning({ children }: PropsWithChildren) {
  return (
    <span className={styles.warning} role="status">
      <span aria-hidden="true">!</span>
      {children}
    </span>
  );
}
