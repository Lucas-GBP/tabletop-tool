import type { CampaignDto } from "@/api";
import { Button, Card } from "./primitives";
import styles from "./CampaignSummaryCard.module.scss";

interface CampaignSummaryCardProps {
  campaign: CampaignDto;
  onOpen: () => void;
}

export function CampaignSummaryCard({
  campaign,
  onOpen,
}: CampaignSummaryCardProps) {
  const sceneCount = new Set(
    campaign.sessions.flatMap((session) =>
      session.scenes.map((association) => association.sceneId),
    ),
  ).size;

  return (
    <Card as="article" className={styles.card}>
      <div>
        <span className={styles.eyebrow}>Campanha</span>
        <h3>{campaign.name}</h3>
      </div>
      <dl className={styles.summary}>
        <div>
          <dt>Sessões</dt>
          <dd>{campaign.sessions.length}</dd>
        </div>
        <div>
          <dt>Cenas usadas</dt>
          <dd>{sceneCount}</dd>
        </div>
      </dl>
      <Button aria-label={`Abrir campanha ${campaign.name}`} onClick={onOpen}>
        Abrir campanha
      </Button>
    </Card>
  );
}
