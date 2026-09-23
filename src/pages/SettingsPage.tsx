import {
  Button,
  EmptyState,
  Panel,
  SectionHeading,
  WorkspaceFeedback,
} from "@/components";
import { useAppSettings } from "@/hooks";
import styles from "./SettingsPage.module.scss";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const app = useAppSettings();
  if (app.loading) {
    return <main className={styles.loading}>Abrindo configurações…</main>;
  }
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Button onClick={onBack}>← Início</Button>
        <div>
          <p>Aplicativo</p>
          <h1>Configurações</h1>
          <span>Preferências gerais do seu espaço de preparação.</span>
        </div>
      </header>
      <WorkspaceFeedback error={app.error} notice={app.notice} />
      <Panel as="section" className={styles.panel}>
        <SectionHeading eyebrow="Biblioteca" title="Pasta de assets" />
        <p className={styles.description}>
          Esta é a raiz comum para áudio, imagens, vídeos e outros assets. Cada
          ferramenta encontra recursivamente os formatos que suporta.
        </p>
        {app.settings.assetDirectory ? (
          <code className={styles.directory}>
            {app.settings.assetDirectory}
          </code>
        ) : (
          <EmptyState title="Nenhuma pasta configurada">
            Escolha a raiz que contém os assets usados nas suas campanhas.
          </EmptyState>
        )}
        <Button
          disabled={app.busy}
          onClick={() => void app.chooseAssetDirectory()}
        >
          {app.settings.assetDirectory ? "Alterar pasta" : "Selecionar pasta"}
        </Button>
      </Panel>
    </main>
  );
}
