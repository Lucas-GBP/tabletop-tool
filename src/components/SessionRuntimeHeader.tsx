import type { CampaignDto, SessionDto } from "@/api";
import { Button } from "./primitives";
import styles from "./SessionRuntimeHeader.module.scss";

interface SessionRuntimeHeaderProps {
  campaign: CampaignDto;
  session: SessionDto;
  onEnd: () => void;
}

export function SessionRuntimeHeader({
  campaign,
  session,
  onEnd,
}: SessionRuntimeHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.context}>
        <span className={styles.badge}>Mesa em andamento</span>
        <span>{campaign.name}</span>
      </div>
      <div className={styles.content}>
        <div>
          <h1>{session.name}</h1>
          <p className={styles.subtitle}>
            Alterações durante a mesa são temporárias.
          </p>
        </div>
        <Button className={styles.end} tone="subtle" onClick={onEnd}>
          Encerrar sessão
        </Button>
      </div>
    </header>
  );
}
