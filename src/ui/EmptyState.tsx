import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "../lib/classNames";
import styles from "./EmptyState.module.scss";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: ReactNode;
  size?: "compact" | "spacious";
}

export function EmptyState({
  title,
  icon,
  size = "compact",
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={classNames(styles.empty, styles[size], className)}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {size === "compact" ? <strong>{title}</strong> : <h3>{title}</h3>}
      {children &&
        (size === "compact" ? <span>{children}</span> : <p>{children}</p>)}
    </div>
  );
}
