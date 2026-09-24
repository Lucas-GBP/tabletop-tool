import type { CampaignDto } from "@/api";
import { Button, EditableText } from "./primitives";
import { ActionMenu } from "./ActionMenu";
import styles from "./CampaignWorkspaceHeader.module.scss";

interface CampaignWorkspaceHeaderProps {
  campaign: CampaignDto;
  disabled: boolean;
  onBack: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

export function CampaignWorkspaceHeader({
  campaign,
  disabled,
  onBack,
  onRename,
  onDelete,
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
        <div className={styles["navigation-actions"]}>
          <span className={styles.mode}>Modo de preparação</span>
          <ActionMenu label={`Mais ações para ${campaign.name}`}>
            <Button
              tone="danger"
              disabled={disabled}
              aria-label={`Excluir campanha ${campaign.name}`}
              onClick={() => {
                if (
                  !window.confirm(
                    `Excluir a campanha ${campaign.name}? As cenas reutilizáveis serão mantidas.`,
                  )
                ) {
                  return;
                }
                void onDelete().then((deleted) => deleted && onBack());
              }}
            >
              Excluir campanha
            </Button>
          </ActionMenu>
        </div>
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
            Prepare as sessões e organize as cenas desta campanha.
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
