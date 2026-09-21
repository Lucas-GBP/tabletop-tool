import type { CampaignDto } from "../../../shared/api";
import { Button, EditableText } from "../../../ui";
import styles from "./CampaignWorkspaceHeader.module.scss";

interface CampaignWorkspaceHeaderProps {
  campaign: CampaignDto;
  disabled: boolean;
  onBack: () => void;
  onRename: (name: string) => Promise<boolean>;
}

export function CampaignWorkspaceHeader({
  campaign,
  disabled,
  onBack,
  onRename,
}: CampaignWorkspaceHeaderProps) {
  const sceneCount = new Set(
    campaign.sessions.flatMap((session) =>
      session.scenes.map((association) => association.sceneId),
    ),
  ).size;

  return (
    <header className={styles.header}>
      <div className={styles.navigation}>
        <Button className={styles.back} onClick={onBack}>
          ← Todas as campanhas
        </Button>
        <span className={styles.mode}>Modo de preparação</span>
      </div>
      <div className={styles.content}>
        <div>
          <p className={styles.eyebrow}>Campanha</p>
          <EditableText
            as="h1"
            value={campaign.name}
            label={`nome da campanha ${campaign.name}`}
            disabled={disabled}
            onSave={onRename}
          />
          <p className={styles.subtitle}>
            Prepare as sessões, organize suas cenas e configure as ferramentas
            desta campanha.
          </p>
        </div>
        <div className={styles.summary} aria-label="Resumo da campanha">
          <strong>{campaign.sessions.length}</strong>
          <span>sessões</span>
          <strong>{sceneCount}</strong>
          <span>cenas usadas</span>
        </div>
      </div>
    </header>
  );
}
