import styles from "./WorkspaceHeader.module.scss";

interface WorkspaceHeaderProps {
  campaignCount: number;
}

export function WorkspaceHeader({ campaignCount }: WorkspaceHeaderProps) {
  return (
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>Tabletop Tool</p>
        <h1>Suas campanhas</h1>
        <p className={styles.subtitle}>
          Crie uma campanha ou entre em uma existente para preparar sessões,
          cenas e ferramentas.
        </p>
      </div>
      <div className={styles.summary} aria-label="Resumo de campanhas">
        <strong>{campaignCount}</strong>
        <span>campanhas</span>
      </div>
    </header>
  );
}
