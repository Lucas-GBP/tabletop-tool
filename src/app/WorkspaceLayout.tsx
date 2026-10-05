import type { ReactNode } from "react";
import { PrimaryNavigation, type PrimarySection } from "./PrimaryNavigation";
import styles from "./WorkspaceLayout.module.scss";

interface WorkspaceLayoutProps {
  active: PrimarySection;
  children: ReactNode;
  onNavigate: (section: PrimarySection) => void;
}

export function WorkspaceLayout({
  active,
  children,
  onNavigate,
}: WorkspaceLayoutProps) {
  return (
    <div className={styles.layout}>
      <PrimaryNavigation active={active} onNavigate={onNavigate} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
